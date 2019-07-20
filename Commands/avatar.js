module.exports = {
    execute: function (msg) {
        let eyed = msg.author.id
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) {
            eyed = msg.mentions.users.first().id
        }

        let link = msg.guild.members.get(eyed).user.displayAvatarURL.split('?').reverse().pop()
        let embed = new Discord.RichEmbed({ description: `[Link](${link})` })
        embed.setImage(link)
        msg.channel.send({ embed: embed })
        return;
    },
    info: {
        aliases: false,
        example: "!avatar (@ user)",
        minarg: "1",
        description: "Displays users avatar",
        category: "Basic",
    }
}