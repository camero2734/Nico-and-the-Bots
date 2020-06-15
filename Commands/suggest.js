module.exports = {
    execute: async function (msg) {
        let channel = msg.guild.channels.get(chans.submittedsuggestions);
        msg.delete();
        let entry = {
            name: msg.member.displayName,
            user: msg.author.id,
            channel: msg.channel.name,
            content: removeCommand(msg.content),
            date: msg.createdTimestamp
        }
        let json = await loadJsonFile("json/suggestions.json");
        json.entries.push(entry);
        await writeJsonFile("json/suggestions.json", json);
        let embed = new Discord.RichEmbed().setColor("RANDOM");
        let member = msg.guild.members.get(entry.user);
        embed.setTitle("New suggestion submitted");
        embed.setAuthor(member.displayName, member.user.displayAvatarURL);
        embed.setFooter(entry.channel + " | " + (new Date(entry.date)).toString());
        embed.setDescription(entry.content);
        await channel.send(embed);
        msg.channel.embed("Your suggestion has been submitted!");
    },
    info: {
        aliases: false,
        example: "!suggest [suggestion]",
        minarg: 2,
        description: "Submit a suggestion directly to the server staff",
        category: "Other",
    }
}