module.exports = {
    execute: function (msg) {
        var args = msg.content.split(/[ ]+/);
        if (!args[2]) return msg.channel.send()
        var answers = ['Yes', 'No', 'Maybe', 'I don\'t know', 'Probably', 'Probably not']
        var answer = Math.floor(Math.random() * 6)
        msg.channel.send(new Discord.RichEmbed({ description: answers[answer] }))
    },
    info: {
        description: "Answers a question",
        argnum: 1,
        example: "!8ball [question]",
        category: "Fun"
    }
}