module.exports = {
    execute: function (msg) {
        let ranhex = ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6)
        let embed = new Discord.RichEmbed({ description: '#' + ranhex })
        embed.setColor(ranhex)
        msg.channel.send({ embed: embed })
    },
    info: {
        aliases: ["randomhex","rh"],
        example: "!randomhex",
        minarg: 0,
        description: "Returns an embed with a random hex color",
        category: "Other",
    }
}