module.exports = {
    execute: async function (msg) {
        msg.delete();
        let messageid = msg.removeCommand(msg.content).replace(/ /g, "");
        let channels = msg.guild.channels.array();
        channels.unshift(msg.channel);
        let found = false;
        for (let channel of channels) {
            if (!found) {
                let perms = channel.permissionsFor(msg.guild.members.get(bot.user.id));
                if (channel.type === "text" && perms.has("READ_MESSAGES")) {
                    let messages = await channel.fetchMessages({ limit: 1, around: messageid });
                    if (messages.get(messageid)) {
                        found = true;
                        const m = messages.get(messageid);
                        let embed = new Discord.RichEmbed();
                        embed.addField("\u200B", m.content ? m.content : "No content (probably an embed)");
                        embed.addField("\u200B", `[Jump to Message](https://discordapp.com/channels/${m.guild.id}/${m.channel.id}/${m.id})`);
                        let d = m.createdAt;
                        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        let dateString = d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + " [" + padStr(d.getHours()) + ":" + padStr(d.getMinutes()) + ":" + padStr(d.getSeconds()) + "]";
                        embed.setFooter(dateString + " in #" + m.channel.name, bot.user.displayAvatarURL);
                        embed.setColor("#" + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6));
                        embed.setAuthor((m.member ? m.member.displayName : m.author.username));
                        embed.setThumbnail(m.author.displayAvatarURL);
                        msg.channel.send({ embed: embed });
                    }
                }
            }
        }
    },
    info: {
        aliases: false,
        example: "!quote [message id]",
        minarg: 2,
        description: "Quotes a user w/ an embed",
        category: "Other"
    }
};