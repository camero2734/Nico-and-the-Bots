module.exports = {
    execute: function (msg) {
        let mems = msg.guild.members.array();

        let hours = msg.content.split(" ")?.[1];
        if (!hours || isNaN(hours)) return msg.channel.embed("Please enter a time in hours!");
        hours = parseFloat(hours);
        if (hours <= 0 || hours > 8760) return msg.channel.embed("You must enter a positive number less than 8760 (one year)!");


        let count = 0;
        let now = Date.now();
        for (let m of mems) {
            if (!m.joinedAt) continue;
            let d = m.joinedAt;
            if (d.getTime() > now - hours * 60 * 60 * 1000) count++
        }
        msg.channel.send(`**${count}** members have joined in the last ${hours} hour${hours === 1 ? "" : "s"}.`)
    },
    info: {
        aliases: false,
        example: "!howmanypeeps",
        minarg: 0,
        description: "how many joined hoy",
        category: "Other",
    }
}
