module.exports = {
    execute: function (msg, args) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus")
        let d = new Date()
        let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        let dateString = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + " [" + d.getHours() + ':' + padStr(d.getMinutes()) + ']'
        let embed = new Discord.RichEmbed({ title: 'UPDATE: ' + dateString, description: msg.removeCommand(msg.content) })
        embed.setColor('#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6))
        msg.guild.channels.get(chans.changelog).send({ embed: embed })
    },
    info: {
        aliases: false,
        example: "!botupdate [update text]",
        minarg: 0,
        description: "Sends a bot update to #changelog",
        category: "Staff",
    }
}