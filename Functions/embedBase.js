module.exports = function(m, t, f, c, a, i) {
    const Discord = require("discord.js");
    let embed = new Discord.RichEmbed({ description: m });
    if (t) embed.setTitle(t)
    if (f) embed.setFooter(f)
    if (c) { embed.setColor(c) } else { embed.setColor("RANDOM")}
    if (a) embed.setAuthor(a)
    if (i) embed.setThumbnail(i)
    return { embed: embed }
}