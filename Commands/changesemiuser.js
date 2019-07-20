module.exports = {
    execute: function (msg) {
        if (msg.author.id !== poot) return msg.channel.send('Only pootus can doodus')
        msg.delete()
        bot.user.setUsername(msg.removeCommand(msg.content))
    },
    info: {
        aliases: false,
        example: "!changesemiuser [name]",
        minarg: 2,
        description: "Changes semi's username",
        category: "NA",
    }
}