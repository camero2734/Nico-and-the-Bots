module.exports = {
    execute: async function (msg) {
        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg);
        let mentioned = msg.mentions.members.first();
        if (mentioned.id === poot) return msg.channel.embed("You cannot steal from poot");
        if (mentioned.id === msg.author.id) return msg.channel.embed("You can't steal from yourself...");

        let stealerEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
        if (!stealerEconomy) stealerEconomy = new Economy(msg.author.id);
        let stolenEconomy = await connection.getRepository(Economy).findOne({ id: mentioned.id });
        if (!stolenEconomy) stolenEconomy = new Economy(msg.author.id);

        if (stealerEconomy.steals < 1) return msg.channel.embed("You don't have any steals!");
        if (stolenEconomy.ingots < 1) return msg.channel.embed(`${mentioned} doesn't have any ingots!`);

        if (stolenEconomy.blocks > 0) {
            if (Math.random() <= 0.7) {
                await msg.channel.embed(mentioned + "'s block was successful! Your attempt to steal an ingot failed.");
                stealerEconomy.steals--;
                stolenEconomy.blocks--;
            } else {
                await msg.channel.embed(mentioned + "'s block failed! You successfully stole an ingot!");
                stealerEconomy.steals--;
                stolenEconomy.blocks--;
                stealerEconomy.ingots++;
                stolenEconomy.ingots--;
            }
        } else {
            let embed = new Discord.RichEmbed({ description: `You successfully stole an ingot from ${mentioned}!` }).setColor(msg.member.displayHexColor);
            await msg.channel.send(embed);
            stealerEconomy.steals--;
            stealerEconomy.ingots++;
            stolenEconomy.ingots--;
        }

        if (stealerEconomy.ingots >= 10) {
            stealerEconomy.ingots = stealerEconomy.ingots % 10;
            stealerEconomy.credits+=2500;
            stealerEconomy.trophies++;
            let embed = new Discord.RichEmbed({ description: "You reached 10 ingots and won a trophy and 2500 credits! Check the trophy leaderboard with `!trophyboard`" }).setColor(msg.member.displayHexColor);
            await msg.channel.send(embed);
        }
        await connection.manager.save(stealerEconomy);
        await connection.manager.save(stolenEconomy);
    },
    info: {
        aliases: false,
        example: "!steal [@ user]",
        minarg: 0,
        description: "Steals an ingot from a user. Requires a steal from !blurrybox",
        category: "Blurrybox"
    }
};