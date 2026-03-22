/**
 * Manages things that are scheduled in the database (reminders, mutes, etc.)
 */

import { differenceInHours, subDays } from "date-fns";
import {
  ChannelType,
  type Client,
  Collection,
  DiscordAPIError,
  type Guild,
  type GuildMember,
  type Snowflake,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { EmbedBuilder } from "@discordjs/builders";
import { userMention } from "@discordjs/formatters";
import { Cron, type ProtectCallbackFn } from "croner";
import { JWT } from "google-auth-library";
import { type GoogleSpreadsheetWorksheet, GoogleSpreadsheet } from "google-spreadsheet";
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

  const serviceAccountAuth = new JWT({
    email: secrets.apis.google.sheets.client_email,
    key: secrets.apis.google.sheets.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet("1M63thXZZLKUc-3Y0IZmCLRYK2BsaFbAs_0P1xSeVRd0", serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  // Helper function to log errors to both console and Discord
  const logError = async (message: string, error: unknown) => {
    console.error(message, error);
    await logErrorToDiscord(guild, message, error);
  };

  // Helper function to wrap tasks with error handling and timeout
  const createSafeTask = (taskName: string, taskFn: () => Promise<void>, timeoutMs: number) => {
    return async () => {
      try {
        console.log(`[Scheduler] ${taskName} running`);

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Task timed out after ${timeoutMs}ms`)), timeoutMs),
        );

        await Promise.race([taskFn(), timeoutPromise]);
      } catch (error) {
        await logError(`Error in ${taskName}`, error);
      }
    };
  };

  // Create safe versions of each task
  const safeCheckReminders = createSafeTask("checkReminders", () => checkReminders(guild), 10_000);
  const safeCheckHouseOfGold = createSafeTask("checkHouseOfGold", () => checkHouseOfGold(guild), 45_000);
  const safeCheckFBApplication = createSafeTask("checkFBApplication", () => checkFBApplication(guild, sheet), 45_000);
  const safeCheckMemberRoles = createSafeTask("checkMemberRoles", () => checkMemberRoles(guild), 100_000);
  const safeCheckVCRoles = createSafeTask("checkVCRoles", () => checkVCRoles(guild), 75_000);
  const protect: ProtectCallbackFn = async (job) => {
    console.log(`[Scheduler] Not run due to protection: ${job.getPattern()}`);
  };

  Cron("*/5 * * * * *", { protect }, safeCheckReminders);

  Cron("*/30 * * * * *", { protect }, async () => {
    await Promise.all([safeCheckHouseOfGold(), safeCheckFBApplication()]);
  });

  Cron("*/60 * * * * *", { protect }, async () => {
    await Promise.all([safeCheckMemberRoles(), safeCheckVCRoles()]);
  });

  console.log("[Scheduler] All cron jobs initialized successfully");
}

async function checkReminders(guild: Guild): Promise<void> {
  const finishedReminders = await prisma.reminder.findMany({
    where: { sendAt: { lte: new Date() } },
  });

  const sentReminderIds = [];
  for (const rem of finishedReminders) {
    try {
      const member = await guild.members.fetch(rem.userId as Snowflake);

      const dm = await member.createDM();
      const embed = new EmbedBuilder().setTitle("Your Reminder").setDescription(rem.text).setTimestamp(rem.createdAt);

      await dm.send({ embeds: [embed] });
      sentReminderIds.push(rem.id);
    } catch (e) {
      if (e instanceof DiscordAPIError && e.code.toString() === "50007") {
        sentReminderIds.push(rem.id);
        await logErrorToDiscord(guild, `Unable to send reminder to user: ${rem.userId} due to DMs being disabled. Will not retry.`, e);
      } else {
        await logErrorToDiscord(guild, `Unable to send reminder to user: ${rem.userId}`, e);
      }
    }
  }

  await prisma.reminder.deleteMany({ where: { id: { in: sentReminderIds } } });
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

async function checkFBApplication(guild: Guild, sheet: GoogleSpreadsheetWorksheet): Promise<void> {
  console.log("[Scheduler] checkFBApplication start");

  const rows = await sheet.getRows();
  const ApplicationIdKey = "Application ID";

  console.log(`[Scheduler] checkFBApplication loaded ${rows.length} rows from sheet`);

  const _lookingForIds = await prisma.firebreatherApplication.findMany({
    where: { submittedAt: null },
    select: { applicationId: true },
  });
  const lookingForIds = new Set(_lookingForIds.map((l) => l.applicationId));

  console.log(`[Scheduler] checkFBApplication looking for ${lookingForIds.size} applications`);

  for (const row of rows) {
    const applicationId = row.get(ApplicationIdKey);

    if (!lookingForIds.has(applicationId)) continue;
    lookingForIds.delete(applicationId); // Ignore any resubmissions

    const keys = row._worksheet.headerValues.filter((k) => !k.startsWith("_") && k !== ApplicationIdKey);

    const jsonData = Object.fromEntries(keys.map((k) => [k, row.get(k)]));

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
