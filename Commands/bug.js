module.exports = {
    execute: function (msg) {
        msg.delete();
        let embed = new Discord.RichEmbed().setColor("RANDOM");
        embed.setDescription(removeCommand(msg.content));
        embed.setAuthor(msg.member.displayName, msg.author.displayAvatarURL);
        embed.setFooter(new Date() + " || Sent from #" + msg.channel.name)
        msg.guild.channels.get(chans.botissues).send(embed);
    },
    info: {
        aliases: ["bug", "issue"],
        example: "!bug [describe what's wrong with the bot]",
        minarg: 2,
        description: "Sends a message to the staff describing the bug you've found in the bot",
        category: "Other",
    }
}
