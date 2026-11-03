import { EmbedBuilder } from "@discordjs/builders";
import { startOfDay } from "date-fns";
import { type Message } from "discord.js";
import type { User } from "../../generated/prisma/client";
import { prisma } from "./prisma-init";

import { queue } from "./jobs";
import type { BotLogger } from "./logging/evlog";

export const updateUserScore = (msg: Message): void => {
  if (!msg.guild || !msg.channel) return;

  queue.score.add({
    data: {
      messageId: msg.id,
      channelId: msg.channel.id,
      guildId: msg.guild.id,
    },
  });
};

const IDEAL_TIME_MS = 12 * 1000; // The ideal time between each message to award a point for
export const updateUserScoreWorker = async (msg: Message, log: BotLogger): Promise<void> => {
  const dbUser = await prisma.user.upsert({
    where: { id: msg.author.id },
    update: {},
    create: { id: msg.author.id, dailyBox: { create: {} } },
  });

  log.set({ user_id: msg.author.id });

  const now = Date.now();
  const timeSince = Math.max(now - dbUser.lastMessageSent.getTime(), 0);

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { lastMessageSent: msg.createdAt },
  });

  // Determine whether to award a point or not (i.e. spamming messages should award no points)
  let earnedPoint = true;
  if (timeSince < IDEAL_TIME_MS) {
    // Calculate probability of earning a point for this message
    const P = (timeSince / IDEAL_TIME_MS) ** 2;
    earnedPoint = Math.random() < P;
  }

  // Ensure the user isn't underleveled already
  if (!earnedPoint) {
    const shouldBeLevel = LevelCalculator.calculateLevel(dbUser.score);
    if (shouldBeLevel > dbUser.level) earnedPoint = true;
  }

  // Add to message history
  const startOfDate = startOfDay(msg.createdAt);
  const historyIdentifier = {
    date_userId: { date: startOfDate, userId: msg.author.id },
  };

  const upsertData: Parameters<(typeof prisma)["messageHistory"]["upsert"]>[0] = {
    where: historyIdentifier,
    update: {
      messageCount: { increment: 1 },
      pointsEarned: { increment: earnedPoint ? 1 : 0 },
    },
    create: {
      date: startOfDate,
      userId: msg.author.id,
      messageCount: 1,
      pointsEarned: earnedPoint ? 1 : 0,
    },
  };

  log.set({ earnedPoint });

  if (earnedPoint) {
    const userUpdateData = await onEarnPoint(msg, dbUser);
    log.set({ update_data: userUpdateData.data });

    await prisma.messageHistory.upsert(upsertData);
    await prisma.user.update(userUpdateData);
  } else await prisma.messageHistory.upsert(upsertData);
};

async function onEarnPoint(msg: Message, dbUser: User): Promise<Parameters<(typeof prisma)["user"]["update"]>[0]> {
  let creditIncrement = 0;
  let setLevel = dbUser.level;
  if (Math.random() > 0.5) creditIncrement += 2; // Random chance of earning some credits on message

  const userLevel = LevelCalculator.calculateLevel(dbUser.score);

  // User has leveled up
  if (userLevel > setLevel) {
    setLevel = userLevel;

    const lvlEmbed = new EmbedBuilder({
      description: `LEVEL UP: You are now level ${userLevel}!`,
    });

    const randomReward = Math.floor(Math.random() * 500) + 200;
    lvlEmbed.addFields([
      {
        name: "Level Bonus",
        value: `You gained ${randomReward} credits for leveling up!`,
      },
    ]);
    creditIncrement += randomReward;

    await msg.reply({
      embeds: [lvlEmbed],
      allowedMentions: { repliedUser: false },
    });
  }

  return {
    where: { id: dbUser.id },
    data: {
      credits: { increment: creditIncrement },
      score: { increment: 1 },
      level: setLevel,
    },
  };
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class LevelCalculator {
  static limit = 2100; // Determines the limit of the derivative (2100 in this case)
  static yIntercept = 80; // Determines the value of L(0)
  static adder = 140; // Causes function to not grow as quickly

  /**
   * Calculates the level using a function that is asymptotic to the line 2100x
   * meaning that the # of points to the next level approaches 2100
   *
   * This is the inverse of {@link calculateScore}
   *
   * @param score The score of the user
   * @returns The level corresponding to the score
   */
  static calculateLevel(score: number) {
    if (score < LevelCalculator.yIntercept) return 0;

    const x = score;
    const A = (x - LevelCalculator.yIntercept) / LevelCalculator.limit; // Helper substitute variable
    return Math.floor(0.5 * (A + Math.sqrt(A * (A + 560))) + Number.EPSILON);
  }

  /**
   * Calculates the minimum score required to be this level.
   * @param score The score of the user
   * @returns The level corresponding to the score
   */
  static calculateScore(level: number) {
    if (level <= 0) return 0;

    const y = level;
    return Math.ceil((LevelCalculator.limit * y * y) / (y + LevelCalculator.adder) + LevelCalculator.yIntercept);
  }

  /**
   * Calculates points remaining until the next level
   */
  static pointsToNextLevel(score: number) {
    const nextLevel = LevelCalculator.calculateLevel(score) + 1;
    const scoreRequired = LevelCalculator.calculateScore(nextLevel);

    return scoreRequired - score;
  }
}
