module.exports = {
    execute: async function (msg) {
        const PING_TIME = 1000 * 60 * 5; // 5 MINUTES

        let m = await msg.channel.send("Ping?");
        await m.delete();
        pings.push({ping: m.createdTimestamp - msg.createdTimestamp, time: Date.now()});

        let pingSum = 0;
        let pingCount = 0;


        for (let i = pings.length - 1; i >= 0; i--) {
            if (pings[i].time + PING_TIME >= Date.now()) {
                pingSum+=pings[i].ping;
                pingCount++;
            } else {
                pings.splice(i, 1);
            }
        }


        let average = Math.floor(pingSum / pingCount);

        await msg.channel.embed(`Heartbeat: ${Math.floor(bot.ping)}ms\nAverage Ping (${pingCount}): ${average}ms\nCurrent Ping: ${m.createdTimestamp - msg.createdTimestamp}ms`);
    },
    info: {
        aliases: false,
        example: "!ping",
        minarg: "1",
        description: "Pings the bot",
        category: "Info",
    }
}