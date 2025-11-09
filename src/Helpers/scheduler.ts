/**
 * Manages things that are scheduled in the database (reminders, mutes, etc.)
 */

import { differenceInHours, subDays } from "date-fns";
import {
  ChannelType,
  type Client,
  Collection,
  EmbedBuilder,
  userMention,
  type Guild,
  type GuildMember,
  type Snowflake,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { Effect, Schedule } from "effect";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { guildID, roles, channelIDs, userIDs } from "../Configuration/config";
import secrets from "../Configuration/secrets";
import { NUM_DAYS_FOR_CERTIFICATION, NUM_GOLDS_FOR_CERTIFICATION } from "../InteractionEntrypoints/contextmenus/gold";
import { sendToStaff } from "../InteractionEntrypoints/slashcommands/apply/firebreathers";
import F from "./funcs";
import { prisma } from "./prisma-init";

// Helper function to log errors to both console and Discord
const logErrorToDiscord = async (guild: Guild, message: string, error: unknown) => {
  console.error(message, error);
  try {
    const testChannel = await guild.channels.fetch(channelIDs.bottest);
    if (testChannel?.isTextBased()) {
      await testChannel.send(`🚨 **Scheduler Error**: ${message}\n\`\`\`${String(error)}\`\`\``);
    }
  } catch (discordError) {
    console.error("Failed to send error to Discord:", discordError);
  }
};

export default async function (client: Client): Promise<void> {
  const guild = await client.guilds.fetch(guildID);

  const doc = new GoogleSpreadsheet("1M63thXZZLKUc-3Y0IZmCLRYK2BsaFbAs_0P1xSeVRd0");
  await doc.useServiceAccountAuth({
    client_email: secrets.apis.google.sheets.client_email,
    private_key: secrets.apis.google.sheets.private_key,
  });

  // Helper function to log errors to both console and Discord
  const logError = async (message: string, error: unknown) => {
    await logErrorToDiscord(guild, message, error);
  };

  // Create effects for each scheduled task with built-in error handling
  const checkRemindersEffect = Effect.promise(() => checkReminders(guild)).pipe(
    Effect.catchAll((error) => Effect.promise(() => logError("Error in checkReminders", error))),
  );

  const checkHouseOfGoldEffect = Effect.promise(() => checkHouseOfGold(guild)).pipe(
    Effect.catchAll((error) => Effect.promise(() => logError("Error in checkHouseOfGold", error))),
  );

  const checkFBApplicationEffect = Effect.promise(() => checkFBApplication(guild, doc)).pipe(
    Effect.catchAll((error) => Effect.promise(() => logError("Error in checkFBApplication", error))),
  );

  const checkMemberRolesEffect = Effect.promise(() => checkMemberRoles(guild)).pipe(
    Effect.catchAll((error) => Effect.promise(() => logError("Error in checkMemberRoles", error))),
  );

  const checkVCRolesEffect = Effect.promise(() => checkVCRoles(guild)).pipe(
    Effect.catchAll((error) => Effect.promise(() => logError("Error in checkVCRoles", error))),
  );

  // Create scheduled effects
  const every5SecondsSchedule = Schedule.fixed("5 seconds");
  const every30SecondsSchedule = Schedule.fixed("30 seconds");
  const every60SecondsSchedule = Schedule.fixed("60 seconds");

  const scheduled5Second = Effect.schedule(
    Effect.all([Effect.sync(() => console.log("[Scheduler] 5sec running")), checkRemindersEffect], {
      concurrency: "unbounded",
    }),
    every5SecondsSchedule,
  );

  const scheduled30Second = Effect.schedule(
    Effect.all(
      [Effect.sync(() => console.log("[Scheduler] 30sec running")), checkHouseOfGoldEffect, checkFBApplicationEffect],
      { concurrency: "unbounded" },
    ),
    every30SecondsSchedule,
  );

  const scheduled60Second = Effect.schedule(
    Effect.all(
      [Effect.sync(() => console.log("[Scheduler] 60sec running")), checkMemberRolesEffect, checkVCRolesEffect],
      { concurrency: "unbounded" },
    ),
    every60SecondsSchedule,
  );

  // Run all scheduled effects concurrently
  const allScheduledTasks = Effect.all([scheduled5Second, scheduled30Second, scheduled60Second], {
    concurrency: "unbounded",
  });

  // Run the scheduler
  Effect.runPromise(allScheduledTasks).catch(console.error);
}

async function checkReminders(guild: Guild): Promise<void> {
  const finishedReminders = await prisma.reminder.findMany({
    where: { sendAt: { lte: new Date() } },
  });

  for (const rem of finishedReminders) {
    try {
      const member = await guild.members.fetch(rem.userId as Snowflake);

      const dm = await member.createDM();
      const embed = new EmbedBuilder().setTitle("Your Reminder").setDescription(rem.text).setTimestamp(rem.createdAt);

      await dm.send({ embeds: [embed] });
    } catch (e) {
      await logErrorToDiscord(guild, `Unable to send reminder to user: ${rem.userId}`, e);
    }
  }

  // Remove them all, regardless of whether they were sent
  const fetchedIds = finishedReminders.map((r) => r.id);
  await prisma.reminder.deleteMany({ where: { id: { in: fetchedIds } } });
}

async function checkMemberRoles(guild: Guild): Promise<void> {
  // Add banditos/new to members who pass membership screening
  const allMembers = await guild.members.fetch();

  const shouldHaveBanditos = (mem: GuildMember) =>
    !mem.roles.cache.has(roles.banditos) &&
    !mem.roles.cache.has(roles.muted) &&
    !mem.roles.cache.has(roles.hideallchannels) &&
    !mem.pending;

  const membersNoBanditos = allMembers.filter(shouldHaveBanditos);

  const testChannel = await guild.channels.fetch(channelIDs.bottest);
  if (!testChannel?.isTextBased()) throw new Error("Test channel is not text-based");
  for (const mem of membersNoBanditos.values()) {
    console.log(`Adding banditos/new to ${mem.user.tag}`);
    await testChannel.send(`${userMention(userIDs.me)} ${mem.user.tag} did not have banditos role, adding it now.`);
    await mem.roles.add(roles.banditos);
    await mem.roles.add(roles.new);
  }

  // Remove new from members who have been in the server long enough
  const NUM_HOURS_STAY_NEW = 6;
  const membersToRemoveNew = allMembers.filter((mem) => {
    if (!mem.roles.cache.has(roles.new) || !mem.joinedAt || mem.pending) return false;
    return differenceInHours(new Date(), mem.joinedAt) >= NUM_HOURS_STAY_NEW;
  });

  for (const mem of membersToRemoveNew.values()) {
    await mem.roles.remove(roles.new);
  }
}

async function checkVCRoles(guild: Guild): Promise<void> {
  const allChannels = await guild.channels.fetch();
  const allMembers = guild.members.cache;

  const voiceChannels = allChannels.filter((c): c is VoiceChannel => c?.type === ChannelType.GuildVoice);

  const membersInVc = new Collection<Snowflake, GuildMember>();

  for (const vc of voiceChannels.values()) {
    for (const member of vc.members.values()) {
      membersInVc.set(member.id, member);
    }
  }

  const membersWithVcRoleArr = allMembers.filter((m) => m.roles.cache.has(roles.vc));
  const membersWithVcRole = new Collection(membersWithVcRoleArr.map((m) => [m.id, m]));

  const toAdd = membersInVc.filter((m) => !membersWithVcRole.has(m.id));
  const toRemove = membersWithVcRole.filter((m) => !membersInVc.has(m.id));

  for (const mem of toAdd.values()) {
    await mem.roles.add(roles.vc);
  }

  for (const mem of toRemove.values()) {
    await mem.roles.remove(roles.vc);
  }
}

async function checkHouseOfGold(guild: Guild): Promise<void> {
  console.log("[Scheduler] checkHouseOfGold start");
  const msgsToDelete = await prisma.gold.groupBy({
    by: ["houseOfGoldMessageUrl"],
    _count: true,
    _min: {
      createdAt: true,
    },
    having: {
      houseOfGoldMessageUrl: {
        _count: { lt: NUM_GOLDS_FOR_CERTIFICATION },
      },
      createdAt: {
        _min: { lt: subDays(new Date(), NUM_DAYS_FOR_CERTIFICATION) },
      },
    },
    where: {
      houseOfGoldMessageUrl: { not: null },
    },
  });

  console.log(`[Scheduler] checkHouseOfGold fetched ${msgsToDelete.length} messages to delete`);

  for (const toDelete of msgsToDelete) {
    try {
      console.log(`DELETING ${toDelete.houseOfGoldMessageUrl}`);
      const ids = F.parseMessageUrl(toDelete.houseOfGoldMessageUrl as string);

      if (!ids) continue;

      try {
        const channel = (await guild.channels.fetch(ids.channelId)) as TextChannel;
        const message = await channel.messages.fetch(ids.messageId);

        await message.delete();
      } catch {
        /** Message already deleted probably  */
      }

      await prisma.gold.updateMany({
        where: { houseOfGoldMessageUrl: toDelete.houseOfGoldMessageUrl },
        data: { houseOfGoldMessageUrl: null },
      });
    } catch (e) {
      await logErrorToDiscord(guild, `Unable to delete House of Gold message: ${toDelete.houseOfGoldMessageUrl}`, e);
    }
  }
  console.log("[Scheduler] checkHouseOfGold end");
}

async function checkFBApplication(guild: Guild, doc: GoogleSpreadsheet): Promise<void> {
  console.log("[Scheduler] checkFBApplication start");
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  const rows = await sheet.getRows();
  const ApplicationIdKey = "Application ID";

  const _lookingForIds = await prisma.firebreatherApplication.findMany({
    where: { submittedAt: null },
    select: { applicationId: true },
  });
  const lookingForIds = new Set(_lookingForIds.map((l) => l.applicationId));

  console.log(`[Scheduler] checkFBApplication looking for ${lookingForIds.size} applications`);

  for (const row of rows) {
    const applicationId = row[ApplicationIdKey];

    if (!lookingForIds.has(applicationId)) continue;
    lookingForIds.delete(applicationId); // Ignore any resubmissions

    const keys = Object.keys(row).filter((k) => !k.startsWith("_") && k !== ApplicationIdKey);

    const jsonData = Object.fromEntries(keys.map((k) => [k, row[k]]));

    // Send to Discord
    const messageUrl = await sendToStaff(guild, applicationId, jsonData);
    if (!messageUrl) continue;

    // Save to DB
    await prisma.firebreatherApplication.update({
      where: { applicationId },
      data: { submittedAt: new Date(), messageUrl, responseData: jsonData },
    });
  }

  console.log("[Scheduler] checkFBApplication end");
}
