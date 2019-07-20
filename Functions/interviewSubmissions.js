module.exports = async function(reaction, user, Discord) {
    let msg = reaction.message;
    if (!msg || !msg.author || !msg.author.bot || !msg.embeds || !msg.embeds[0] || !msg.embeds[0].footer) return msg.channel.embed("error");

    let accepting = reaction.emoji.name === "✅";

    await msg.clearReactions();

    let newEmbed = new Discord.RichEmbed(msg.embeds[0]);
    newEmbed.setColor(accepting ? "#00FF00" : "#FF0000");
    msg.edit(newEmbed);

    if (accepting) {
        await msg.guild.roles.get("595478773487501376").setMentionable(true);
        let m = await msg.guild.channels.get(Discord.chans.interviews).send("<@&595478773487501376>", {embed: newEmbed});
        await m.react("📺");
        setTimeout(async () => {
            await msg.guild.roles.get("595478773487501376").setMentionable(false);
        }, 1000);
    }
}