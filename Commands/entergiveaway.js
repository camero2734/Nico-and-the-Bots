module.exports = {
    execute: async function(msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Merry Trenchmas!")
        let giveaway = await loadJsonFile("giveaway.json")
        let fin = []

        for (let id in giveaway) {
            let totalEntries = 0;
            for (let i = 0; i <= 30; i++) {
                if (typeof giveaway[id][i.toString()] !== "undefined" && giveaway[id][i.toString()] === "1") totalEntries += i
            }
            if (msg.guild.members.get(id)) fin.push({id: id, amount: totalEntries})
        }
        fin.sort(function (a, b) { return (a.amount > b.amount) ? 1 : ((b.amount > a.amount) ? -1 : 0); }).reverse();
        
        let m = await msg.channel.send(new Discord.RichEmbed().setDescription(`PICKING WINNER...`).setColor("FCE300"));

        (async function() {
            try {
                console.log('here')
                for (let i = 0; i < 1000; i++) {
                    console.log('here2')
                    await new Promise(next => {
                        console.log('here3')
                        let winner = chooseWinner()
                        let embed = new Discord.RichEmbed().setDescription(`PERSON #${i+1} IS <@${winner}>. PERSON #1000 WILL BE THE WINNER.`).setColor("FCE300")
                        m.edit(embed)
                        console.log('edited')
                        setTimeout(() => {
                            next()
                        }, 5000)
                    })
                }
            } catch(e) {
                console.log(e, /ERR/)
            }
            
        })();
        function chooseWinner() {
            let entries = []
            for (let mem of fin) {
                let am = mem.amount;
                for (let i = 0; i < am; i++) entries.push(mem.id)
            }
            return entries[Math.floor(Math.random() * entries.length)]
        }
    },
    info: {
        aliases: ["entergiveaway","giveaway"],
        example: "!entergiveaway",
        minarg: 0,
        description: "Enter poot's giveaway",
        category: "N/A",
    }
}