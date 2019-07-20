module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;

        if (msg.channel.id !== "470331990231744512" && msg.author.id != poot) return msg.channel.embed(`You can only use !blurrybox in <#470331990231744512>!`)
        let row = await sql.get(`SELECT * FROM blurrybox WHERE userid="${msg.author.id}"`)
        if (!row) await sql.run("INSERT INTO blurrybox (Tokens, Steal, Block, Ingot, Trophy, userid) VALUES (?, ?, ?, ?, ?, ?)", [0, 0, 0, 0, 0, msg.author.id]);
        if (!row.Tokens || row.Tokens < 1) return msg.channel.send('`You don\'t have any tokens!`')
        let prizes = []
        class Prize {
            constructor(description, chance, execute) {
                this.description = description
                this.chance = chance
                this.toExecute = execute
            }
            award(msg) {
                this.toExecute(msg)
            }
        }
        let doubleIngot = false
        prizes.push(new Prize("a steal", 20, (msg) => {
            sql.run(`UPDATE blurrybox SET Steal="${row.Steal + 1}" WHERE userid="${msg.author.id}"`);
            sendImage("bbsteal.png");
            msg.channel.embed('You won a `steal`! Simply use `!steal @user` to take one of their ingots. If they have a `block`, your attempt will fail 70% of the time and they will lose a block while you lose your steal.')
        }))
        prizes.push(new Prize("a block", 5, (msg) => {
            sql.run(`UPDATE blurrybox SET Block="${row.Block + 1}" WHERE userid="${msg.author.id}"`);
            sendImage("bbsteal.png");
            msg.channel.embed('You won a `block`! You have a 70% chance of being protected from one !steal.')
        }))
        prizes.push(new Prize("an extra ingot", 15, (msg) => {
            doubleIngot = true;
            sendImage("bbsteal.png");
            sql.run(`UPDATE blurrybox SET Ingot="${row.Ingot + 2}" WHERE userid="${msg.author.id}"`);
            msg.channel.embed('You won two ingots!')
        }))
        prizes.push(new Prize("500 Credits", 25, async function (msg) {
            let creds = 500;
            let money_row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`);
            let currentxp = money_row.xp;
            sendImage("bbsteal.png");
            sql.run(`UPDATE daily SET xp="${currentxp + creds}" WHERE userId="${msg.author.id}"`);
            msg.channel.embed("`You won " + creds + " credits!`")
        }))
        prizes.push(new Prize("1000 Credits", 10, async function (msg) {
            let creds = 1000
            let money_row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`)
            let currentxp = money_row.xp
            sql.run(`UPDATE daily SET xp="${currentxp + creds}" WHERE userId="${msg.author.id}"`);
            sendImage("bbsteal.png");
            msg.channel.embed("`You won " + creds + " credits!`")
        }))
        prizes.push(new Prize("2500 Credits", 5, async function (msg) {
            let creds = 2500
            let money_row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`)
            let currentxp = money_row.xp
            sql.run(`UPDATE daily SET xp="${currentxp + creds}" WHERE userId="${msg.author.id}"`);
            sendImage("bbsteal.png");
            msg.channel.embed("`You won " + creds + " credits!`")
        }))
        prizes.push(new Prize("nothing", 20, (msg) => {
            sendImage("bbsteal.png");
            msg.channel.embed("You won nothing :(")
        }))
        let prizes_array = []
        for (let prize of prizes) { for (let i = 0; i < prize.chance; i++) { prizes_array.push(prize) } }
        let chosen_prize = prizes_array[Math.floor(Math.random() * prizes_array.length)]
        chosen_prize.award(msg)
        sql.run(`UPDATE blurrybox SET Tokens="${row.Tokens - 1}" WHERE userid="${msg.author.id}"`)
        if (!doubleIngot) sql.run(`UPDATE blurrybox SET Ingot="${row.Ingot + 1}" WHERE userid="${msg.author.id}"`);
        row = await sql.get(`SELECT * FROM blurrybox WHERE userid="${msg.author.id}"`)
        let ingotNum = row.Ingot
        if (row.Ingot >= 10) {
            sql.run(`UPDATE blurrybox SET Ingot="${row.Ingot % 10}", Trophy=${row.Trophy + 1} WHERE userid="${msg.author.id}"`);
            ingotNum = row.Ingot % 10
            msg.channel.embed("You reached 10 ingots and won a trophy and 2500 credits! Check the trophy leaderboard with `!trophyboard`")
            let money_row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`)
            let currentxp = money_row.xp
            sql.run(`UPDATE daily SET xp="${currentxp + 2500}" WHERE userId="${msg.author.id}"`);
        }
        msg.channel.send(`\`You have ${row.Tokens} token${(row.Tokens === 1) ? "" : "s"} left!\``)
        msg.channel.send(`\`You now have ${ingotNum} ingot${(ingotNum === 1) ? "" : "s"}! ${10 - ingotNum} remaining.\``)


        async function sendImage(link) {
            let backgroundImage = fs.readFileSync(link);
            await msg.channel.send(new Discord.Attachment(link, "SPOILER_blurrybox.png"));
        }

    },
    info: {
        aliases: false,
        example: "!blurrybox",
        minarg: 0,
        description: "Opens a Blurrybox using a daily token",
        category: "Blurrybox",
    }
}