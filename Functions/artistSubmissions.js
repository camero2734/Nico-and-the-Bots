module.exports = async function(reaction, user, Discord) {
    let msg = reaction.message;
    await msg.delete();
    if (!msg || !msg.embeds || !msg.embeds[0] || !msg.embeds[0].footer) return msg.channel.send("error");
    let member = msg.guild.members.get(msg.embeds[0].footer.text);
    if (!member) return msg.channel.send("error2");

    let accepting = reaction.emoji.name === "✅";

    if (accepting) await member.addRole("341029793954922496");

    let dm = await member.createDM();
    if (dm) {
        await dm.embed(`You were ${accepting ? "approved for" : "denied"} the Artist/Musician role${accepting ? "!" : ". Please wait a few months if you wish to try again."}`)
    }
    await msg.channel.embed("Done.")
}