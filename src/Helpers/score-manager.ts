import { startOfDay } from "date-fns";
import { Message, MessageEmbed, MessageReference, TextChannel } from "discord.js";
import { prisma } from "./prisma-init";
import { User } from "@prisma/client";

import { Queue, Worker } from "bullmq";
import { NicoClient } from "../../app";
import IORedis from "ioredis";

const QUEUE_NAME = "ScoreUpdate";

const onHeorku = process.env.ON_HEROKU === "1";
const redisOpts = onHeorku ? { connection: new IORedis(process.env.REDIS_URL) } : undefined;

const scoreQueue = new Queue(QUEUE_NAME, redisOpts);

export const updateUserScore = (msg: Message): void => {
    if (!msg.guild || !msg.channel) return;
    const reference: MessageReference = {
        guildId: msg.guild.id,
        channelId: msg.channel.id,
        messageId: msg.id
    };
    scoreQueue.add("score", reference);
};

// TODO: Create separate worker process(es)?
new Worker(
    QUEUE_NAME,
    async (job) => {
        if (job.name !== "score") return;
        try {
            const count = await scoreQueue.count();
            if (count > 50) {
                console.log(`[Score Queue]: Items in queue: ${count}`);
            }

            const msgRef = job.data as MessageReference;
            if (!msgRef?.messageId) throw Error("no msg id");

            // These should be cached via discord.js so lookup time is no issue
            const guild = await NicoClient.guilds.fetch(msgRef.guildId);
            const channel = (await guild.channels.fetch(msgRef.channelId)) as TextChannel;
            const msg = await channel.messages.fetch(msgRef.messageId);

            await updateUserScoreWorker(msg);
        } catch (e) {
            console.log(e, /WORKER_ERR/);
        }
    },
    redisOpts
);

const IDEAL_TIME_MS = 12 * 1000; // The ideal time between each message to award a point for
const updateUserScoreWorker = async (msg: Message): Promise<void> => {
    const dbUser =
        (await prisma.user.findUnique({ where: { id: msg.author.id } })) ||
        (await prisma.user.create({
            data: { id: msg.author.id, dailyBox: { create: {} } }
        }));

    const now = Date.now();
    const timeSince = now - dbUser.lastMessageSent.getTime();

    await prisma.user.update({ where: { id: dbUser.id }, data: { lastMessageSent: new Date() } });

    // Determine whether to award a point or not (i.e. spamming messages should award no points)
    let earnedPoint = true;
    if (timeSince < IDEAL_TIME_MS) {
        // Calculate probability of earning a point for this message
        const P = Math.pow(timeSince / IDEAL_TIME_MS, 2);
        earnedPoint = Math.random() < P;
    }

    // Add to message history
    const startOfDate = startOfDay(new Date());
    const historyIdentifier = { date_userId: { date: startOfDate, userId: dbUser.id } };

    const upsertData: Parameters<typeof prisma["messageHistory"]["upsert"]>[0] = {
        where: historyIdentifier,
        update: {
            messageCount: { increment: 1 },
            pointsEarned: { increment: earnedPoint ? 1 : 0 }
        },
        create: {
            date: startOfDate,
            userId: dbUser.id,
            messageCount: 1,
            pointsEarned: earnedPoint ? 1 : 0
        }
    };

    if (earnedPoint) {
        const userUpdateData = await onEarnPoint(msg, dbUser);
        // Ensure the messageHistory perfectly tracks the score
        await prisma.$transaction([
            prisma.messageHistory.upsert(upsertData),
            prisma.user.update(userUpdateData)
        ]); // prettier-ignore
    } else await prisma.messageHistory.upsert(upsertData);
};

async function onEarnPoint(msg: Message, dbUser: User): Promise<Parameters<typeof prisma["user"]["update"]>[0]> {
    let creditIncrement = 0;
    let setLevel = dbUser.level;
    if (Math.random() > 0.5) creditIncrement += 2; // Random chance of earning some credits

    const userLevel = LevelCalculator.calculateLevel(dbUser.score);

    if (userLevel > setLevel) {
        setLevel = userLevel;
        // User has "leveled up"
        const hasPerk = !!(await prisma.perk.findUnique({
            where: { userId_type: { userId: dbUser.id, type: "LevelCredits" } }
        }));

        const lvlEmbed = new MessageEmbed({ description: `LEVEL UP: You are now level ${userLevel}!` });

        if (hasPerk) {
            const randomReward = Math.floor(Math.random() * 1500) + 201;
            lvlEmbed.addField("Perk Bonus", `You gained ${randomReward} credits for leveling up!`);
            creditIncrement += randomReward;
        }

        await msg.reply({ embeds: [lvlEmbed], allowedMentions: { repliedUser: false } });
    }

    return {
        where: { id: dbUser.id },
        data: {
            credits: { increment: creditIncrement },
            score: { increment: 1 },
            level: setLevel
        }
    };
}

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
        if (score < this.yIntercept) return 0;

        const x = score;
        const A = (x - this.yIntercept) / this.limit; // Helper substitute variable
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
        return Math.ceil((this.limit * y * y) / (y + this.adder) + this.yIntercept);
    }

    /**
     * Calculates points remaining until the next level
     */
    static pointsToNextLevel(score: number) {
        const nextLevel = this.calculateLevel(score) + 1;
        const scoreRequired = this.calculateScore(nextLevel);

        console.log({ score, nextLevel, scoreRequired });

        return scoreRequired - score;
    }
}
