module.exports = async function (content) {
    const Discord = require("discord.js");
    function embed(m, t, f, c, a, i) {
        let embed = new Discord.RichEmbed({ description: m });
        if (t) embed.setTitle(t);
        if (f) embed.setFooter(f);
        if (c) { embed.setColor(c); } else { embed.setColor("#" + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6)); }
        if (a) embed.setAuthor(a);
        if (i) embed.setThumbnail(i);
        return { embed: embed };
    }
    return await this.send(embed(content));
};