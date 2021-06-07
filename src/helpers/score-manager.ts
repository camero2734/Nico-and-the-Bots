import { CreditHistory } from "database/entities/CreditHistory";
import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import { XPDelay } from "database/entities/XPDelay";
import { Message, MessageEmbed } from "discord.js";
import { Connection } from "typeorm";
import { startOfDay } from "date-fns";

export const updateUserScore = async (msg: Message, connection: Connection): Promise<void> => {
    const IDEAL_TIME_MS = 12 * 1000; // The ideal time between each message to award a point for

    // How long since last message?
    let userXP = await connection.getRepository(XPDelay).findOne({ userid: msg.author.id });
    if (!userXP) {
        userXP = new XPDelay({ userid: msg.author.id, messageCount: 0, nextTime: 0 });
    }

    const now = Date.now();
    const timeSince = now - userXP.nextTime;
    userXP.nextTime = now;
    await connection.manager.save(userXP);

    // Determine whether to award a point or not (i.e. spamming messages should award no points)
    let earnedPoint = true;
    if (timeSince < IDEAL_TIME_MS) {
        // Calculate probability of earning a point for this message
        const P = Math.pow(timeSince / IDEAL_TIME_MS, 2);
        earnedPoint = Math.random() < P;
    }
    if (!earnedPoint) return;

    // Update score and level
    let userEconomy = await connection.getRepository(Economy).findOne({ userid: msg.author.id });
    if (!userEconomy) userEconomy = new Economy({ userid: msg.author.id });
    userEconomy.score++;

    // Randomly give credits sometimes
    if (Math.random() > 0.5) userEconomy.credits += 2;

    // Add to credit history
    const startOfDate = startOfDay(new Date());
    const todayCreditHistory =
        (await connection.getRepository(CreditHistory).findOne({ date: startOfDate })) ||
        new CreditHistory({ date: startOfDate });

    if (!todayCreditHistory.entries[msg.author.id]) todayCreditHistory.entries[msg.author.id] = 0;
    todayCreditHistory.entries[msg.author.id]++;

    await connection.manager.save(todayCreditHistory);

    // Calculate the level
    const getLevel = (score: number): number => {
        let rq = 100;
        let totalScore = 0;
        let curLevel = 0;
        while (totalScore < score) {
            rq += 21 - Math.pow(1.001450824, rq);
            curLevel++;
            totalScore += rq;
        }
        return curLevel;
    };

    const userLevel = getLevel(userEconomy.score);

    if (userLevel > userEconomy.level) {
        // User has "leveled up"
        const hasPerk = await connection
            .getRepository(Item)
            .findOne({ identifier: msg.author.id, title: "lvlcred", type: "Perk" });

        let perkStr = "";
        if (hasPerk) {
            const randomReward = Math.floor(Math.random() * 1500) + 201;
            perkStr = `You gained ${randomReward} credits for leveling up!`;
            userEconomy.credits += randomReward;
        }
        userEconomy.level = userLevel;
        const lvlEmbed = new MessageEmbed({ description: `LEVEL UP: You are now level ${userLevel}!` }).setColor(
            "RANDOM"
        );
        if (perkStr) lvlEmbed.addField("Perk Bonus", perkStr);
        await msg.reply({ embed: lvlEmbed });
    }

    await connection.manager.save(userEconomy);
};
