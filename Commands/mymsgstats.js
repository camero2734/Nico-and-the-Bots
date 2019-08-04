module.exports = {
    execute: async function (msg) {
        console.log("stats");
        let id = msg.author.id;
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) id = msg.mentions.users.first().id;
        
        let epoch = new Date(2019, 6, 1); //JULY 1ST 2019
        let startOfToday = (new Date()).setHours(0, 0, 0, 0);
        let today = Math.round(Math.abs((epoch.getTime() - startOfToday) / (24 * 60 * 60 * 1000)));
        let recaps = await connection.getRepository(Recap).find({ id: id, day: today });
        if (!recaps || recaps.length === 0) return msg.channel.embed("You must have the recap role to use this command (`!recap`)");
        let json = { day: today };
        for (let rc of recaps) {
            if (!json[rc.channel]) json[rc.channel] = 0;
            json[rc.channel]++;
        }

        let buffer = await sendMsgStats(json, msg);
        await msg.channel.send({ file: buffer });

        

    }
,
    info: {
        aliases: ["mymsgstats","usermsgstats"],
        example: "!mymsgstats",
        minarg: 0,
        description: "Display's a user's messages per channel in a pie chart",
        category: "Other",
    }
}