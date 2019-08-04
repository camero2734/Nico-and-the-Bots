module.exports = {
    execute: function (msg) {
        return msg.channel.embed("Command under construction!")
    }
,
    info: {
        aliases: false,
        example: "!msgstats",
        minarg: 0,
        description: "Displays today's messages per channel for the whole server",
        category: "Staff",
    }
}