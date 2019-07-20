module.exports = {
    execute: function (msg) {
        let rter = Math.floor((Math.random() * 10) + 1)
        var args = msg.content.substring(6)
        if (!args) return this.embed()
        if (args.indexOf("@") !== -1) {
            args = args.replace(/@/g, "")
        }
        msg.channel.send({ embed: new Discord.RichEmbed({ description: "I would rate " + args + " **" + rter + " / 10!**" }) })
    },
    info: {
        aliases: false,
        example: "!rate [something to be rated]",
        minarg: 2,
        description: "Rates something from 1-10",
        category: "Fun",
    }
}