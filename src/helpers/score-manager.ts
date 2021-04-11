import { XPDelay } from "database/entities/XPDelay";
import { Message } from "discord.js";
import { Connection } from "typeorm";
import { constants } from "configuration/config";
import { MessageLog } from "database/entities/MessageLog";
import * as R from "ramda";
import F from "helpers/funcs";
import { Economy } from "database/entities/Economy";

export const addToScore = async (msg: Message, connection: Connection): Promise<void> => {
    let userXP = await connection.getRepository(XPDelay).findOne({ id: msg.author.id });
    if (!userXP) {
        userXP = new XPDelay({ id: msg.author.id, messageCount: 0, nextTime: 0 });
    }

    // Increment their message count
    userXP.messageCount++;

    // If it's not time to dispense points yet, just save their new message count
    if (userXP.nextTime > Date.now() - constants.xpDelayMS) {
        await connection.manager.save(userXP);
        return;
    }

    // Time to update their score

    // Inherently, 1 message = 1 point. To reduce spam, this is scaled down as a users sends more msgs/min
    const delayMins = constants.xpDelayMS / (1000 * 60);
    const lowerMsgsMin = 5 * delayMins;
    const upperMsgsMin = 20 * delayMins;
    const spamValue = (n: number) => R.clamp(0, 1, F.unlerp(n, upperMsgsMin, lowerMsgsMin)); // Value between [0-1] for nth message

    // Calculate the total number of credits they receive
    const sum = R.sum(R.map(spamValue, F.indexArray(userXP.messageCount)));

    let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
    if (!userEconomy) userEconomy = new Economy({ id: msg.author.id });

    // Randomly give credits sometimes
    if (Math.random() > 0.5) userEconomy.credits += 2;

    //
    // Calculate the level
    //

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

    const userLevel = getLevel(userEconomy.alltimeScore + sum);
};
