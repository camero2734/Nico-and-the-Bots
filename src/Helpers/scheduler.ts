/**
 * Manages things that are scheduled in the database (reminders, mutes, etc.)
 */

import { EmbedBuilder } from "@discordjs/builders";
import { userMention } from "@discordjs/formatters";
import { Cron, type ProtectCallbackFn } from "croner";
import { differenceInHours, subDays, subHours } from "date-fns";
import {
  ChannelType,
  type Client,
  Collection,
  DiscordAPIError,
  GatewayRateLimitError,
  type Guild,
  type GuildMember,
  type Snowflake,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { channelIDs, guildID, roles, userIDs } from "../Configuration/config";
import { NUM_DAYS_FOR_CERTIFICATION, NUM_GOLDS_FOR_CERTIFICATION } from "../InteractionEntrypoints/contextmenus/gold";
import F from "./funcs";
import { queue } from "./jobs";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent } from "./logging/wide-event";
import { prisma } from "./prisma-init";

// Helper function to log errors to Discord
const logErrorToDiscord = async (guild: Guild, message: string, error: unknown) => {
  try {
    const testChannel = await guild.channels.fetch(channelIDs.bottest);
    if (testChannel?.isTextBased()) {
      await testChannel.send(`🚨 **Scheduler Error**: ${message}\n\`\`\`${String(error)}\`\`\``);
    }
  } catch (discordError) {
    // Failed to send to Discord, error will be in wide event
  }
};

export default async function (client: Client): Promise<void> {
  const guild = await client.guilds.fetch(guildID);

  const createSafeTask = (taskName: string, taskFn: () => Promise<void>, timeoutMs: number) => {
    return async () => {
      const wideEvent = createBackgroundEvent(`task.${taskName}`);
      const startTime = Date.now();

      // Set up a warning timer that fires if task takes longer than expected
      const warningTimer = setTimeout(async () => {
        await logErrorToDiscord(
          guild,
          `Task ${taskName} is taking longer than ${timeoutMs}ms (still running)`,
          new Error(`Slow task warning: ${taskName} started at ${new Date(startTime).toISOString()}`),
        );
      }, timeoutMs);

      try {
        await taskFn();
        clearTimeout(warningTimer);
        finalizeWideEvent(wideEvent, "success");
      } catch (error) {
        clearTimeout(warningTimer);
        finalizeWideEvent(wideEvent, "error", error);
        await logErrorToDiscord(guild, `Error in ${taskName}`, error);
      }

      emitWideEvent(wideEvent);
    };
  };

  // Create safe versions of each task
  const safeCheckReminders = createSafeTask("checkReminders", () => checkReminders(guild), 10_000);
  const safeCheckHouseOfGold = createSafeTask("checkHouseOfGold", () => checkHouseOfGold(guild), 45_000);
  const safeCheckMemberRoles = createSafeTask("checkMemberRoles", () => checkMemberRoles(guild), 100_000);
  const safeCheckVCRoles = createSafeTask("checkVCRoles", () => checkVCRoles(guild), 75_000);
  const safeCheckLastFm = createSafeTask("checkLastFm", () => checkLastFm(), 15_000);
  const protect: ProtectCallbackFn = async (job) => {
    console.log(`[Scheduler] Not run due to protection: ${job.getPattern()}`);
  };

  Cron("*/5 * * * * *", { protect }, safeCheckReminders);

  Cron("*/30 * * * * *", { protect }, async () => {
    await Promise.all([safeCheckHouseOfGold()]);
  });

  Cron("0 */2 * * * *", { protect }, async () => {
    await Promise.all([safeCheckMemberRoles(), safeCheckVCRoles()]);
  });

  Cron("0 0 */12 * * *", { protect }, async () => {
    await Promise.all([safeCheckLastFm()]);
  });
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
        await logErrorToDiscord(
          guild,
          `Unable to send reminder to user: ${rem.userId} due to DMs being disabled. Will not retry.`,
          e,
        );
      } else if (e instanceof DiscordAPIError && e.code.toString() === "10007") {
        sentReminderIds.push(rem.id);
        await logErrorToDiscord(
          guild,
          `Unable to send reminder to user: ${rem.userId} because they are not in the guild. Will not retry.`,
          e,
        );
      } else {
        await logErrorToDiscord(guild, `Unable to send reminder to user: ${rem.userId}`, e);
      }
    }
  }

  await prisma.reminder.deleteMany({ where: { id: { in: sentReminderIds } } });
}

async function checkMemberRoles(guild: Guild): Promise<void> {
  // Add banditos/new to members who pass membership screening
  const allMembers = await guild.members.fetch().catch((e) => {
    if (e instanceof GatewayRateLimitError) {
      console.warn("Rate limited while fetching members for checkMemberRoles, skipping this run");
    } else throw e;
  });

  if (!allMembers) return;

  const shouldHaveBanditos = (mem: GuildMember) =>
    !mem.roles.cache.has(roles.banditos) &&
    !mem.roles.cache.has(roles.muted) &&
    !mem.roles.cache.has(roles.hideallchannels) &&
    !mem.pending;

  const membersNoBanditos = allMembers.filter(shouldHaveBanditos);

  const testChannel = await guild.channels.fetch(channelIDs.bottest);
  if (!testChannel?.isTextBased()) throw new Error("Test channel is not text-based");
  for (const mem of membersNoBanditos.values()) {
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

  for (const toDelete of msgsToDelete) {
    try {
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
}

export async function checkLastFm(): Promise<void> {
  const usersToUpdate = await prisma.user.findMany({
    select: { id: true },
    where: {
      lastFM: {
        lastUpdated: { lt: subHours(new Date(), 0) },
      },
    },
  });

  await queue.lastFm.addBulk(
    usersToUpdate.map((u) => ({ payload: { userId: u.id }, opts: { deduplication: { id: u.id } } })),
  );
}