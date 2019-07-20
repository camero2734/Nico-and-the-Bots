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
        example: "!callvote Do you like dolphins? (yes, no, maybe)",
        minarg: 2,
        description: "Creates a vote that other users can participate in. End with !endvote",
        category: "Voting",
    }
}