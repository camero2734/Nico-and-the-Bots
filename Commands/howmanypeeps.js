module.exports = {
    execute: function (msg) {
        let mems = msg.guild.members.array()
        let count = 0;
        let today = new Date()
        for (let m of mems) {
            let d = m.joinedAt
            if (today.getDate() === d.getDate() && today.getMonth() === d.getMonth() && today.getFullYear() === d.getFullYear()) count++
        }
        msg.channel.send(`**${count}** members have joined today.`)
    },
    info: {
        aliases: false,
        example: "!howmanypeeps",
        minarg: 0,
        description: "how many joined hoy",
        category: "Other",
    }
}