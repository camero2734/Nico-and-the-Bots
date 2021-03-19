import { CommandOptionType } from "slash-create";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed } from "discord.js";

interface Ping {
    ping: number;
    time: number;
}

const previousPings: Ping[] = [];

export const Options: CommandOptions = {
    description: "Checks the bot's ping",
    options: [{ name: "test", description: "This is a test option", required: false, type: CommandOptionType.BOOLEAN }]
};

export const Executor: CommandRunner = async (ctx) => {
    const receivedAt = Date.now();
    const PING_TIME = 1000 * 60 * 5; // 5 MINUTES

    const res = await ctx.sendFollowUp("Ping?");
    const sentAt = Date.now();
    await res.delete();

    const currentPing = sentAt - receivedAt;

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
    await ctx.embed(embed);
};
