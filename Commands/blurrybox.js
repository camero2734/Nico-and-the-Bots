module.exports = {
    execute: async function(msg) {
        if (msg.channel.id !== "470331990231744512" && msg.channel.id !== "470406597860917249" && msg.author.id != poot) return msg.channel.embed("You can only use !blurrybox in <#470331990231744512>!");

        let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
        if (!userEconomy) userEconomy = new Economy({id: msg.author.id});
        if (userEconomy.blurrytokens < 1) return msg.channel.embed("`You don't have any tokens!`");
        let prizes = [];
        class Prize {
            constructor(description, chance, execute) {
                this.description = description;
                this.chance = chance;
                this.toExecute = execute;
            }
            async award() {
                let embed = new Discord.RichEmbed().setColor("RANDOM");
                embed.setDescription(`${msg.member}, ` + this.toExecute());
                await msg.channel.send(embed);
                return embed;
            }
        }

        prizes.push(new Prize("a steal", 20, () => {
            userEconomy.steals++;
            return "You won a `steal`! Simply use `!steal @user` to take one of their ingots. If they have a `block`, your attempt will fail 70% of the time and they will lose a block while you lose your steal.";
        }));
        prizes.push(new Prize("a block", 5, () => {
            userEconomy.blocks++;
            return "You won a `block`! You have a 70% chance of being protected from one !steal.";
        }));
        prizes.push(new Prize("an extra ingot", 15, () => {
            userEconomy.ingots++;
            return "You won an extra ingot!";
        }));
        prizes.push(new Prize("500 Credits", 25, () => {
            userEconomy.credits+=500;
            return "`You won " + 500 + " credits!`";
        }));
        prizes.push(new Prize("1000 Credits", 10, () => {
            userEconomy.credits+=1000;
            return "`You won " + 1000 + " credits!`";
        }));
        prizes.push(new Prize("2500 Credits", 5, () => {
            userEconomy.credits+=2500;
            return "`You won " + 2500 + " credits!`";
        }));
        prizes.push(new Prize("nothing", 20, () => {
            return "You won nothing :(";
        }));
        let prizes_array = [];
        for (let prize of prizes) {
            for (let i = 0; i < prize.chance; i++) {
                prizes_array.push(prize);
            }
        }

        //CHOOSE PRIZE
        let chosen_prize = prizes_array[Math.floor(Math.random() * prizes_array.length)];
        let prizeEmbed = await chosen_prize.award(msg);
        userEconomy.blurrytokens--;
        userEconomy.ingots++;

        if (userEconomy.ingots >= 10) {
            userEconomy.ingots = userEconomy.ingots % 10;
            userEconomy.credits+=2500;
            userEconomy.trophies++;
            let embed = new Discord.RichEmbed({ description: "You reached 10 ingots and won a trophy and 2500 credits! Check the trophy leaderboard with `!trophyboard`" }).setColor(prizeEmbed.color);
            msg.channel.send(embed);
        }

        await connection.manager.save(userEconomy);
        let embed = new Discord.RichEmbed({ description: `You have **${userEconomy.blurrytokens} blurrytoken${userEconomy.blurrytokens === 1 ? "" : "s"}** remaining and you now have **${userEconomy.ingots} ingot${userEconomy.ingots === 1 ? "" : "s"}**!` }).setColor(prizeEmbed.color);
        msg.channel.send(embed);
    },
    info: {
        aliases: ["blurrybox", "bb"],
        example: "!blurrybox",
        minarg: 0,
        description: "Opens a Blurrybox using a daily token",
        category: "Blurrybox"
    }
};
