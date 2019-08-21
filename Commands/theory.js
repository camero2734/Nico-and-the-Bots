module.exports = {
    execute: function (msg) {
        let theory = msg.removeCommand(msg.content)
        let perms = msg.guild.channels.get(chans.theorylist).permissionsFor(msg.member)
        if (perms.has('EMBED_LINKS')) {
            let embed = new Discord.RichEmbed({ description: theory })
            embed.setFooter(msg.createdAt.toString() + ' || Submit a theory with !theory in the commands channel', bot.user.displayAvatarURL)
            embed.setColor('#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6))
            embed.setAuthor(msg.member.displayName)
            embed.setThumbnail(msg.author.displayAvatarURL)

            msg.guild.channels.get(chans.theorylist).send({ embed: embed }).then(async m => {await m.react('%E2%AC%86'); await m.react('%E2%AC%87')})
            msg.channel.embed(`Post to <#${chans.theorylist}> successful!`)
            msg.delete()
        } else {
            msg.channel.embed(`You do not have permission to post to <#${chans.theorylist}>`)
        }

    },
    info: {
        aliases: false,
        example: "!theory [Your theory]",
        minarg: 2,
        description: "Submits a theory to <#470335416709677056>",
        category: "Other",
    }
}