module.exports = {
    execute: async function (msg) {
        let embed = new Discord.RichEmbed({ title: "Blurrybox items" });
        let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
        if (!userEconomy) userEconomy = new Economy(msg.author.id);
        let { blurrytokens, steals, blocks, ingots, trophies } = userEconomy;
        let hasArr = [blurrytokens, steals, blocks, ingots, trophies];
        let titles = ["💸 Blurrytokens", "⚔️ Steals", "❌ Blocks", "💎 Ingots", "🏆 Trophies"];
        for (let i = 0; i < hasArr.length; i++) {
            embed.addField(titles[i], hasArr[i]);
        }
        msg.channel.send(embed);
    },
    info: {
        aliases: ["mystats", "inventory"],
        example: "!mystats",
        minarg: 0,
        description: "Displays the items you've won from !blurrybox",
        category: "Blurrybox"
    }
};