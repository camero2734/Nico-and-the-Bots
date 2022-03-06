import { Embed, ApplicationCommandOptionType, Colors } from "discord.js";
import { SlashCommand } from "../../Structures/EntrypointSlashCommand";

interface Ping {
    ping: number;
    time: number;
}

const previousPings: Ping[] = [];

const command = new SlashCommand(<const>{
    description: "Checks the bot's ping",
    options: []
});

command.setHandler(async (ctx) => {
    const PING_TIME = 1000 * 60 * 5; // 5 MINUTES

    await ctx.send({ content: "Pinging..." });

    const prior = Date.now();
    const after = ctx.createdAt.getTime();

    const currentPing = Math.abs(after - prior);

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

    previousPings[0].time;

    const average = Math.floor(pingSum / pingCount);

    const embed = new Embed()
        .setColor(Colors.Gold)
        .setTitle(`Pinged ${currentPing}ms`)
        .addField({ name: "Heartbeat", value: `${Math.floor(ctx.client.ws.ping)}ms` })
        .addField({ name: "Average ping", value: `${average}ms over ${pingCount} ping${pingCount === 1 ? "" : "s"}` });
    await ctx.editReply({ embeds: [embed] });
});

export default command;
