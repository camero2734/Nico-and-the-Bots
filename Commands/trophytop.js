module.exports = {
    execute: async function (msg, args) {
        let inputNum = (args[1] > 0 && args[1] / args[1] === 1) ? args[1] : 1
        let rows = await sql.all(`SELECT * FROM blurrybox ORDER BY Trophy DESC, Ingot DESC`)
        let embed = new Discord.RichEmbed({ title: "Trophy Leaderboard" })
        let i = 1
        let upperbound = 10 * inputNum
        let lowerbound = upperbound - 9
        for (let row of rows) {
            if (i <= upperbound && i >= lowerbound) {
                if (msg.guild.members.get(row.userid)) {
                    embed.addField(i + '. ' + msg.guild.members.get(row.userid).displayName, '🏆 x' + row.Trophy + '  💎x' + row.Ingot)
                } else i--
            }
            i++
        }
        embed.setFooter("🏆 = Trophies || 💎 = Ingots || Earn 10 Ingots to get a trophy")
        msg.channel.send({ embed: embed })
    },
    info: {
        aliases: ["trophytop","trophyboard"],
        example: "!trophytop (page #)",
        minarg: 0,
        description: "Displays a leaderboard of trophies (each gained from reaching 10 !blurrybox ingots)",
        category: "Blurrybox",
    }
}