module.exports = {
    execute: function (msg) {
        msg.channel.send("Ping?").then((message) => {
            message.delete();
            msg.channel.embed("Heartbeat: " + bot.ping + "ms\nPing: " + (message.createdTimestamp - msg.createdTimestamp) + "ms")
        })
    },
    info: {
        aliases: false,
        example: "!ping",
        minarg: "1",
        description: "Pings the bot",
        category: "Info",
    }
}