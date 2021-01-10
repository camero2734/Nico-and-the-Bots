import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Connection } from "typeorm";

interface Ping {
    ping: number;
    time: number;
}

export default new Command({
    name: "ping",
    description: "Checks the bot's ping",
    category: "Info",
    usage: "!ping",
    example: "!ping",

    persistent: [],

    async cmd(msg: CommandMessage): Promise<void> {
        const PING_TIME = 1000 * 60 * 5; // 5 MINUTES

        const pings = this.persistent as Ping[];

        const m = await msg.channel.send("Ping?");
        await m.delete();
        pings.push({ ping: m.createdTimestamp - msg.createdTimestamp, time: Date.now() });

        let pingSum = 0;
        let pingCount = 0;

        for (let i = pings.length - 1; i >= 0; i--) {
            if (pings[i].time + PING_TIME >= Date.now()) {
                pingSum += pings[i].ping;
                pingCount++;
            } else {
                pings.splice(i, 1);
            }
        }

        const average = Math.floor(pingSum / pingCount);

        await msg.channel.embed(
            `Heartbeat: ${Math.floor(msg.client.ws.ping)}ms\nAverage Ping (${pingCount}): ${average}ms\nCurrent Ping: ${
                m.createdTimestamp - msg.createdTimestamp
            }ms`
        );
    }
});
