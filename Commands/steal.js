module.exports = {
    execute: async function (msg) {
        let row = await sql.get(`SELECT * FROM blurrybox WHERE userid="${msg.author.id}"`)
        if (!row || !row.Steal || row.Steal < 1) return msg.channel.embed("You don't have any steals! Use !blurrybox to try to get one!")
        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg)
        let mentioned = msg.mentions.members.first()
        if (mentioned.id === poot) return msg.channel.embed("You cannot steal from poot")
        if (mentioned.id === msg.author.id) return msg.channel.embed("You can't steal from yourself...")
        let row2 = await sql.get(`SELECT * FROM blurrybox WHERE userid="${mentioned.id}"`)
        if (!row2 || !row2.Ingot || row2.Ingot < 1) return msg.channel.embed(mentioned.displayName + " does not have any ingots!")
        if (row2.Block && row2.Block > 0) {
            if (Math.random() <= 0.7) {
                msg.channel.embed(mentioned.displayName + "'s block was successful! Your attempt to steal an ingot failed.")
                sql.run(`UPDATE blurrybox SET Steal="${row.Steal - 1}" WHERE userid="${msg.author.id}"`);
                sql.run(`UPDATE blurrybox SET Block="${row2.Block - 1}" WHERE userid="${mentioned.id}"`);
            } else {
                msg.channel.embed(mentioned.displayName + "'s block failed! You successfully stole an ingot!")
                sql.run(`UPDATE blurrybox SET Block="${row2.Block - 1}" WHERE userid="${mentioned.id}"`);
                sql.run(`UPDATE blurrybox SET Ingot="${row.Ingot + 1}" WHERE userid="${msg.author.id}"`);
                sql.run(`UPDATE blurrybox SET Ingot="${row2.Ingot - 1}" WHERE userid="${mentioned.id}"`);
                sql.run(`UPDATE blurrybox SET Steal="${row.Steal - 1}" WHERE userid="${msg.author.id}"`);
                checkforten()
            }
        } else {
            sql.run(`UPDATE blurrybox SET Ingot="${row.Ingot + 1}" WHERE userid="${msg.author.id}"`);
            sql.run(`UPDATE blurrybox SET Ingot="${row2.Ingot - 1}" WHERE userid="${mentioned.id}"`);
            sql.run(`UPDATE blurrybox SET Steal="${row.Steal - 1}" WHERE userid="${msg.author.id}"`);
            msg.channel.embed("You successfully stole an ingot from " + mentioned.displayName + "!")
            checkforten()
        }
        async function checkforten() {
            let row = await sql.get(`SELECT * FROM blurrybox WHERE userid="${msg.author.id}"`)
            if (row.Ingot >= 10) {
                sql.run(`UPDATE blurrybox SET Ingot="${row.Ingot % 10}", Trophy=${row.Trophy + 1} WHERE userid="${msg.author.id}"`);
                ingotNum = row.Ingot % 10
                msg.channel.embed("You reached 10 ingots and won a trophy and 2500 credits! Check the trophy leaderboard with `!trophyboard`")
                let money_row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`)
                let currentxp = money_row.xp
                sql.run(`UPDATE daily SET xp="${currentxp + 2500}" WHERE userId="${msg.author.id}"`);
            }
        }
    },
    info: {
        aliases: false,
        example: "!steal [@ user]",
        minarg: 0,
        description: "Steals an ingot from a user. Requires a steal from !blurrybox",
        category: "Blurrybox",
    }
}