module.exports = {
    execute: function (msg) {
        let emojis = msg.guild.emojis.array()
        let toSend = ""
        for (let emoji of emojis) toSend += emoji.name + '\n'
        msg.channel.send(toSend)
    },
    info: {
        aliases: false,
        example: "!getemojis",
        minarg: 0,
        description: "",
        category: "N/A",
    }
}