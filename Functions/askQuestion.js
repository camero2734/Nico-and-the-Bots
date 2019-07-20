module.exports = async function(msg, Discord) {
    console.log("received question/answer")
    let poot = "221465443297263618"
    let guild = msg.client.guilds.get("269657133673349120")
    
    if (msg.channel.id === "470406723572596746") {
        let userid = msg.content.split(" ")[0];
        let member = await guild.members.get(userid);
        if (!member) return;
        let dm = await guild.members.get(userid).createDM();
        if (!dm) return;
        let embed = new Discord.RichEmbed().setColor("RANDOM");
        let content = msg.content.split(" "); content.shift();
        embed.setDescription(content.join(" "));
        embed.setAuthor(msg.author.username, msg.author.displayAvatarURL);
        embed.setFooter("Feel free to respond with another question, or react with ☑️ to say thanks!");
        dm.send(embed);
        msg.channel.embed("Answer sent.")
    } else {
        let embed = new Discord.RichEmbed().setColor("RANDOM")
        let chan = await guild.channels.get("470406723572596746");
        embed.setDescription(msg.content);
        embed.setAuthor(msg.author.username, msg.author.displayAvatarURL);
        embed.setFooter(msg.author.id);
        chan.send(embed);
        msg.channel.embed("Your question has been submitted.")
    }
}