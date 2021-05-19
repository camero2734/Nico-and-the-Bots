import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import { LevelToken } from "database/entities/LevelToken";
import { XPDelay } from "database/entities/XPDelay";
import { Message, MessageEmbed } from "discord.js";
import { Connection } from "typeorm";

export const updateUserScore = async (msg: Message, connection: Connection): Promise<void> => {
    const IDEAL_TIME_MS = 12 * 1000; // The ideal time between each message to award a point for

    // How long since last message?
    let userXP = await connection.getRepository(XPDelay).findOne({ id: msg.author.id });
    if (!userXP) {
        userXP = new XPDelay({ id: msg.author.id, messageCount: 0, nextTime: 0 });
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

    // Update score and level if earned a point
    if (!earnedPoint) return;

    let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
    if (!userEconomy) userEconomy = new Economy({ id: msg.author.id });

    userEconomy.monthlyScore++;
    userEconomy.alltimeScore++;

    // Randomly give credits sometimes
    if (Math.random() > 0.5) userEconomy.credits += 2;

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

    const userLevel = getLevel(userEconomy.alltimeScore);
    if (userLevel > userEconomy.alltimeLevel) {
        // User has "leveled up"
        const hasPerk = await connection
            .getRepository(Item)
            .findOne({ id: msg.author.id, title: "lvlcred", type: "Perk" });

        let perkStr = "";
        if (hasPerk) {
            const randomReward = Math.floor(Math.random() * 1500) + 201;
            perkStr = `You gained ${randomReward} credits for leveling up!`;
            userEconomy.credits += randomReward;
        }
        userEconomy.alltimeLevel = userLevel;
        const levelTokens = await updateTokens(msg, connection, userLevel);
        const lvlEmbed = new MessageEmbed({ description: `LEVEL UP: You are now level ${userLevel}!` }).setColor(
            "RANDOM"
        );
        if (perkStr) lvlEmbed.addField("Perk Bonus", perkStr);
        if (levelTokens > 0) lvlEmbed.addField("Level Tokens", `You gained ${levelTokens} level tokens!`);
        await msg.channel.send(msg.member, { embed: lvlEmbed });
    }

    await connection.manager.save(userEconomy);
};

// Awards Level Tokens when necessary
async function updateTokens(msg: Message, connection: Connection, currentLevel: number) {
    const tokenNum = (x: number) => Math.floor(0.0001 * x * x + 0.045 * x + 1);
    let gained = 0;
    let preLT = await connection.getRepository(LevelToken).findOne({ id: msg.author.id });
    if (!preLT) {
        const newLT = new LevelToken({ id: msg.author.id, value: 0, lastLevel: 0 });
        await connection.manager.save(newLT);
        preLT = newLT;
    }
    let lastLevel = preLT.lastLevel;
    for (let i = preLT.lastLevel + 1; i <= currentLevel; i++) {
        if (i % 5 === 0) {
            gained += tokenNum(i);
            lastLevel = i;
        }
    }

    if (gained >= 1) {
        preLT.value += gained;
        preLT.lastLevel = lastLevel;
        await connection.manager.save(preLT);
    }
    return gained;
}
