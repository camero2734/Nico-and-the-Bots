module.exports = {
    execute: function (msg) {
        msg.delete();
        let anonymous_name = "ANON_";
        for (let j = 0; j < msg.author.id.length; j += 4) {
            anonymous_name += (parseInt(msg.author.id.charAt(j)) + 1).toString();
        }
        if (anonymous_name.length < 11) anonymous_name += parseInt(msg.author.id.charAt(msg.author.id.length - 1)).toString();
        let embed = new Discord.RichEmbed({ title: `**${anonymous_name}**` });
        embed.setDescription(msg.removeCommand(msg.content));
        embed.setFooter("Sent anonymously with the !venting command", bot.user.displayAvatarURL);
        let color = map_v(parseInt(anonymous_name.substring(5)), 0, 999999, 0, 16777216);
        while (color > 16777214) color = Math.floor(color / 2);
        function map_v(value, low1, high1, low2, high2) { return low2 + (high2 - low2) * (value - low1) / (high1 - low1); }
        embed.setColor(color);
        msg.guild.channels.get(chans.venting).send({ embed: embed });
    },
    info: {
        disable: 1,
        aliases: ["venting", "anonvent", "av"],
        example: "!venting [what you want to say]",
        minarg: 2,
        description: "Sends an anonymous message to venting. Immediately deletes your message.",
        category: "Other"
    }
};