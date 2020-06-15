module.exports = {
    execute: async function (msg) {
        if (!msg.member.hasRole("330877657132564480")) return msg.channel.embed("You cannot use this command");
        if (msg.content.toLowerCase().indexOf("check") !== -1) {
            console.log('here')
            let chans = msg.guild.channels.array()
            let m = await msg.channel.send(new Discord.RichEmbed({description: "Fetching channels that are in slowmode..."}).setColor("RANDOM"))
            let slowChans = []
            for (let chan of chans) {
                if (chan.type === 'text') {
                    let slowTime = await chan.rateLimitPerUser;
                    if (!isNaN(slowTime) && slowTime > 0) slowChans.push(chan.name)
                }
            }
            let embed = new Discord.RichEmbed().setColor("RANDOM")
            for (let name of slowChans) {
                embed.addField(name, '\u200b')
            }
            console.log('here')
            m.edit(embed)
        }
        else if (msg.args && !isNaN(msg.args[1])) {
            if (msg.args[1] > 21600) return msg.channel.embed(`Slowmode must be between 1 and 21600 seconds (6 hours).`)
            msg.channel.setRateLimitPerUser(msg.args[1]);
            msg.channel.embed(`Turned on ${msg.args[1]} second slowmode.`)
        } else {
            let currentRate = await msg.channel.rateLimitPerUser;
            if (currentRate > 0) {
                msg.channel.setRateLimitPerUser(0);
                msg.channel.embed("Turned off slowmode!")
            } else {
                msg.channel.setRateLimitPerUser(30)
                msg.channel.embed("Turned on 30 second slowmode.")
            }
        }
    },
    info: {
        aliases: false,
        example: "!slowmode",
        minarg: 0,
        description: "Turns on slowmode for the current channel",
        category: "Staff",
    }
}
