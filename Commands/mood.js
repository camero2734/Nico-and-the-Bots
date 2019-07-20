module.exports = {
    execute: function (msg) {
        let toMoodify = msg.removeCommand(msg.content)
        if (msg.author.id === poot) msg.delete()
        msg.channel.send("<:fcemofish:476209546260512798> " + toMoodify + " <:emofish:476208740413210639>", { disableEveryone: true })
    },
    info: {
        aliases: ["mood","emofish"],
        example: "!mood [text to moodify here]",
        minarg: 2,
        description: "Returns a mood",
        category: "Fun",
    }
}