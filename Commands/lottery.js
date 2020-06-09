module.exports = {
    execute: async function (msg) {
        if (msg.author.id === poot && msg.content.indexOf("reset") !== -1) {
            msg.channel.embed("Resetting lottery...");
            let entries = await storage.entries();
            await storage.removeItem("_time");
            for (let entry of entries) await storage.removeItem(entry);
            return;
        }
        let cost = 1000;
        if (await storage.getItem(msg.author.id) && msg.author.id !== poot) return msg.channel.embed("You have already entered!");

        if (!(await askCost())) return msg.channel.embed("Lottery entry cancelled");

        let credits = await checkCredits();

        if (credits < 0) return msg.channel.embed("You do not have enough credits! You need " + (-credits) + " more.");
        else msg.channel.embed(`You entered into the lottery for ${cost} credits! You now have ${credits} credits remaining`);



        let lotteryTime = await storage.getItem("_time");

        if (!lotteryTime || typeof lotteryTime === "undefined") {
            console.log(/HERE/);
            let count = (await storage.entries()).length;
            console.log(count, /COUNT/);
            if (count > 0) await storage.setItem("_time", Date.now());
        }



        await storage.setItem(msg.author.id, Date.now());

        async function checkCredits() {
            let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
            if (!userEconomy) userEconomy = new Economy({id: msg.author.id});
            if (userEconomy.credits < cost) return userEconomy.credits - cost;
            userEconomy.credits-=cost;
            await connection.manager.save(userEconomy);
            return userEconomy.credits;
        }

        async function askCost() {
            return new Promise(resolve => {
                msg.channel.send(new Discord.RichEmbed({ description: `Do you want to enter the lottery for ${cost} credits?` }).setColor("RANDOM").setFooter("Reply with Yes or No")).then(async (mes) => {
                    let response = await msg.channel.awaitMessage(msg.member, m => {return ((m.content.toLowerCase().indexOf("yes") !== -1 || m.content.toLowerCase().indexOf("no") !== -1) && m.author.id === msg.author.id);});
                    resolve(response && response.content && response.content.toLowerCase().indexOf("yes") !== -1);
                });
            });
        }

    },
    info: {
        aliases: ["lottery", "enterl", "el"],
        example: "!lottery [amount of credits]",
        minarg: 0,
        description: "Enters the specified amount of credits into the lottery",
        category: "Fun"
    }
};
/*return msg.channel.embed("Lottery is temporarily disabled.")
        var args = msg.content.split(' ')
        if (!args || !args[1] || parseInt(args[1]) / parseInt(args[1]) !== 1) return msg.channel.send('```Proper command usage is !lottery [amount]```')
        var amount = args[1]
        if (amount < 50 || isNaN(args[1])) return msg.channel.send('```Amount must be at least 50 credits!```')
        __.get(`SELECT * FROM daily WHERE userId ="${msg.author.id}"`).then(row => {
            var able = row.xp
            if (able < amount) return msg.channel.send('Not enough credits!')
            var prev = 0
            var total = 0
            var k = 0
            var highest = 0
            for (var key in lottery) {
                if (lottery.hasOwnProperty(key)) {
                    total += parseInt(lottery[key].amount)
                    k++
                    if (parseInt(lottery[key].amount) > highest) {
                        highest = parseInt(lottery[key].amount)
                    }
                }
            }
            if (lottery[msg.author.id]) {
                prev = lottery[msg.author.id].amount
            }
            var use
            var average = ((total - parseInt(prev)) / (parseInt(k) - 1)) * 3
            use = ~~(highest * 1.5)
            if (variables.twentyfour) {
                use = 99999999999999999999999
            }

            function allowed(amount) {
                return true
                // if ((total === 0) && (amount < 3000)) return true
                // if ((amount > 3000) && ((total === 0) || (k < 2))) {
                //   use = 3000
                //   return false
                // }
                // if ((amount < 500) && (amount <= total)) return true
                // if (amount < use + 1) return true
                // return false
            }
            if (!allowed(parseInt(amount) + parseInt(prev))) return msg.channel.send({ embed: new Discord.RichEmbed({ description: "Total lottery entry (including current entry) can be at most " + parseInt(use) }) })
            lottery[msg.author.id] = { user: msg.author.id, amount: parseInt(amount) + parseInt(prev) }
            fs.writeFile("./lottery.json", JSON.stringify(lottery), (err) => { if (err) console.error(err) })
            msg.channel.send({ embed: new Discord.RichEmbed({ description: 'You have entered with ' + amount + ' credits!' }) })
        })
*/
