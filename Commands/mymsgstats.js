module.exports = {
    execute: function (msg, args) {
        if (args[1] && msg.guild.members.get(args[1].replace(/<|>|!|@/g, ""))) {
            let id = args[1].replace(/<|>|!|@/g, "")
            if (!recap[id]) return;
            sendMsgStats(recap[id], msg).then((buffer) => {
                msg.channel.send({ file: buffer })
            })
        } else {
            if (!recap[msg.author.id]) return;
            sendMsgStats(recap[msg.author.id], msg).then((buffer) => {
                msg.channel.send({ file: buffer })
            })
        }

    },
    info: {
        aliases: ["mymsgstats","usermsgstats"],
        example: "!mymsgstats",
        minarg: 0,
        description: "Display's a user's messages per channel in a pie chart",
        category: "Other",
    }
}