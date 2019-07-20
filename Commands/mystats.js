module.exports = {
    execute: async function (msg) {
        let embed = new Discord.RichEmbed({ title: "Blurrybox items" })
        let row = await sql.get(`SELECT * FROM blurrybox WHERE userid="${msg.author.id}"`)
        if (!row) return msg.channel.embed("No stats available because you have not used !blurrybox yet")
        let i = 0
        let _emojis = ['💸', '⚔️', '❌', '💎', '🏆']
        for (let prop in row) {
            if (prop !== 'userid') {
                embed.addField(_emojis[i] + ' ' + prop, row[prop])
            }
            i++
        }
        msg.channel.send({ embed: embed })
    },
    info: {
        aliases: ["mystats","inventory"],
        example: "!mystats",
        minarg: 0,
        description: "Displays the items you've won from !blurrybox",
        category: "Blurrybox",
    }
}