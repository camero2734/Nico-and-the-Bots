module.exports = {
    execute: async function(msg) {
        if (msg.author.id !== poot) return;
        let maxAmount = 121000
        let m = await msg.channel.send("`Normalizing everyone's credits to " + maxAmount + "...`")
        let rows = await sql.all(`SELECT * FROM daily`)
        console.log(rows, /ROWS/)
        for (let row of rows) {
            let member = msg.guild.members.get(row.userId)
            console.log(member ? member.displayName : "undefined user")
            await new Promise(async next => {
                if (!row || !member || !row.xp || parseInt(row.xp) <= maxAmount) next()
                else {
                    let dm = await member.createDM()
                    await m.edit("`Normalizing " + member.displayName + "'s credits...`\n(-" + (row.xp-maxAmount) + ")")
                    await dm.send(new Discord.RichEmbed({description: `Everyone's credits have been normalized. Because you had more than ${maxAmount} credits, your credits have been set to ${maxAmount}.`}).setColor("RANDOM"))
                    await sql.run(`UPDATE daily SET xp=121000 WHERE userId="${row.userId}"`)
                    await delay(2000)
                    next()
                }
            })
            
        }
    },
    info: {disable: true}
}