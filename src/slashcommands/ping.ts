import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed } from "discord.js";

interface Ping {
    ping: number;
    time: number;
}

const previousPings: Ping[] = [];

export const Options: CommandOptions = {
    description: "Checks the bot's ping",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    const PING_TIME = 1000 * 60 * 5; // 5 MINUTES

    await ctx.send("Pinging...");

    const prior = Date.now();
    const m = await ctx.channel.send("This is a surprise ping message");
    await m.delete();
    const after = m.createdTimestamp;

    const currentPing = after - prior;

    previousPings.push({ ping: currentPing, time: Date.now() });

    let pingSum = 0;
    let pingCount = 0;

    for (let i = previousPings.length - 1; i >= 0; i--) {
        if (previousPings[i].time + PING_TIME >= Date.now()) {
            pingSum += previousPings[i].ping;
            pingCount++;
        } else {
            previousPings.splice(i, 1);
        }
    }

    const average = Math.floor(pingSum / pingCount);

    const embed = new MessageEmbed()
        .setColor("RANDOM")
        .setDescription(
            `Heartbeat: ${Math.floor(
                ctx.client.ws.ping
            )}ms\nAverage Ping (${pingCount}): ${average}ms\nCurrent Ping: ${currentPing}ms`
        );
    await ctx.send({ embeds: [embed.toJSON()] });
};
