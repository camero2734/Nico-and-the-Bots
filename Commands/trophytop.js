module.exports = {
    execute: async function (msg, args) {
        let page = (!isNaN(args[1]) && args[1] > 0) ? args[1] : 1;
        let userEconomies = await connection.getRepository(Economy).createQueryBuilder("e").orderBy("e.trophies", "DESC").addOrderBy("e.ingots", "DESC").skip(10 * page - 10).take(10).getMany();
        let embed = new Discord.RichEmbed({ title: "Trophy Leaderboard" });
        let i = 0;
        for (let econ of userEconomies) {
            if (msg.guild.members.get(econ.id)) {
                embed.addField(i + ". " + msg.guild.members.get(econ.id).displayName, "🏆 x" + econ.trophies + "  💎x" + econ.trophies);
            } else embed.addField(i + ". Invalid User", "🏆 x0  💎x0");
            i++;
        }
        embed.setFooter("🏆 = Trophies || 💎 = Ingots || Earn 10 Ingots to get a trophy");
        msg.channel.send(embed);
    },
    info: {
        aliases: ["trophytop", "trophyboard"],
        example: "!trophytop (page #)",
        minarg: 0,
        description: "Displays a leaderboard of trophies (each gained from reaching 10 !blurrybox ingots)",
        category: "Blurrybox"
    }
};