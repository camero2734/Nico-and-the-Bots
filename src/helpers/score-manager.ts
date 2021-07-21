import { startOfDay } from "date-fns";
import { Message, MessageEmbed } from "discord.js";
import { prisma } from "./prisma-init";
import { User } from "@prisma/client";

export const updateUserScore = async (msg: Message): Promise<void> => {
    const IDEAL_TIME_MS = 12 * 1000; // The ideal time between each message to award a point for

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

    await prisma.messageHistory.upsert({
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
    });

    if (earnedPoint) return onEarnPoint(msg, dbUser);
};

async function onEarnPoint(msg: Message, dbUser: User): Promise<void> {
    let creditIncrement = 0;
    let setLevel = dbUser.level;
    if (Math.random() > 0.5) creditIncrement += 2; // Random chance of earning some credits

    const userLevel = calculateLevel(dbUser.score);

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

        await msg.reply({ embeds: [lvlEmbed] });
    }

    await prisma.user.update({
        where: { id: dbUser.id },
        data: {
            credits: { increment: creditIncrement },
            score: { increment: 1 },
            level: setLevel
        }
    });
}

export function calculateLevel(score: number): number {
    let rq = 100;
    let totalScore = 0;
    let curLevel = 0;
    while (totalScore < score) {
        rq += 21 - Math.pow(1.001450824, rq);
        curLevel++;
        totalScore += rq;
    }
    return curLevel;
}
