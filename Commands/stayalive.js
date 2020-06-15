module.exports = {
    execute: function (msg) {
        msg.channel.send({
            embed: new Discord.RichEmbed({
                description: "**For a list of crisis resources in your area, please visit https://yourlifecounts.org/find-help/**\nor\n**https://en.wikipedia.org/wiki/List_of_suicide_crisis_lines**",
                color: 309759
            })
        })
    },
    info: {
        aliases: ["stayalive", "sahlofolina"],
        example: "!stayalive",
        minarg: 0,
        description: "Returns a list of organizations that can help in a crisis",
        category: "Other",
    }
}
