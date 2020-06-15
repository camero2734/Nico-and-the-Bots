module.exports = {
    execute: async function(msg){
        const moment = require('moment');
        let strikes = await loadJsonFile("json/strikes.json")
        if (!strikes[msg.author.id] || Object.keys(strikes[msg.author.id]).length <= 0) return msg.channel.embed("You are not currently banned from any channels!")
        
        let bans = []

        for (let channel in strikes[msg.author.id]) {
            //Has strikes
            if (strikes[msg.author.id][channel].count > 0 && strikes[msg.author.id][channel].count < 3) {

                //Ban already corrected
                if (strikes[msg.author.id][channel].time < 0) {
                    // it aint a ban then gg
                }
                //Strike still not completed
                else if (Date.now() < strikes[msg.author.id][channel].time) {
                    let duration = new moment.duration(strikes[msg.author.id][channel].time - Date.now())
                    bans.push({time: `${duration.days() >= 1 ? (duration.days() + " day(s) ") : ("")}${duration.hours()} hour(s) and ${duration.minutes()} minute(s) remaining`, channel: channel})
                }
                //Strike completed, not corrected
                else if (Date.now() >= strikes[msg.author.id][channel].time) {
                    if (msg.guild.channels.get(channel).permissionOverwrites && msg.guild.channels.get(channel).permissionOverwrites.get(msg.author.id)) msg.guild.channels.get(channel).permissionOverwrites.get(msg.author.id).delete()
                    strikes[msg.author.id][channel].time = -1
                    writeJsonFile("json/strikes.json", strikes)
                    bans.push({time: "Ended!", channel: channel})
                }
            } else if (strikes[msg.author.id][channel].time < 0 && strikes[msg.author.id][channel].count >= 3) {
                bans.push({time: "Permanent", channel: channel})
            }
        }
        let banEmbed = new Discord.RichEmbed({title: "Channel bans"}).setColor("RANDOM")
        if (bans.length <= 0) return msg.channel.embed("You are not currently banned from any channels!")
        for (let ban of bans) {
            banEmbed.addField(msg.guild.channels.get(ban.channel).name, ban.time)
        }
        msg.channel.send({embed: banEmbed})

    },
    info: {
        aliases: false,
        example: "!chanbans",
        minarg: 0,
        description: "Either unbans a user from <#470335358970757145> or displays the time left until they are unbanned",
        category: "Other",
    }
}