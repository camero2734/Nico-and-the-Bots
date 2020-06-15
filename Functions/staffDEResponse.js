module.exports = async function(reaction, user, Discord) {
    let msg = reaction.message;
    const PERCENTREQ = 0.6;
    const qTime = 3 * 60 * 1000;
    const filter = (m => (m.author.id === user.id));
    try {
        if (!msg || !msg.embeds || !msg.embeds[0]) return msg.channel.send("error");
        //CHECK IF ALREADY REACTED TO
        let reactions = msg.reactions.array();
        let reactionCount = 0;
        reactions.forEach(e => {
            reactionCount+=e.count;
        });
        //if (reactionCount !== 3) return reaction.remove();
        msg.clearReactions();

        let accepting = reaction.emoji.name === "✅";

        let membed = msg.embeds[0];
        let member = msg.guild.members.get(membed.footer.text);
        let passed = 0;
        let total = 0;

        for (let field of membed.fields) {
            if (field.name.startsWith("✅")) passed++, total++;
            else if (field.name.startsWith("❌")) total++;
        }
        let percent = passed / total;
        let passing = percent >= PERCENTREQ;
        let embed = new Discord.RichEmbed().setAuthor("Response for " + member.displayName, member.user.avatarURL);
        if (accepting && passing) {
            //Makes sense
            embed.setColor("GREEN");
            embed.setDescription("You are approving " + member.displayName + "'s application for Death Eater. They meet at least " + (PERCENTREQ * 100) + "% of the requirements, so **no explanation is needed.**\n\nIf you want to leave a comment, feel free to do so, otherwise simply respond to this message with `NA`.");
            msg.channel.send(embed);
            let msgs = await msg.channel.awaitMessages(filter, { max: 1, time: qTime, errors: ['time'] });
            let reply = msgs.first().content;
            acceptDeathEater(member, reply.trim().toLowerCase() === "na" ? "" : reply, user);
        } else if (accepting && !passing) {
            //Needs explanation
            embed.setColor("RED");
            embed.setDescription("You are approving " + member.displayName + "'s application for Death Eater. They do not meet at least " + (PERCENTREQ * 100) + "% of the requirements, so **an explanation is required.**\n\nPlease respond to this message with a thorough explanation of why this user is being accepted despite not meeting the requirements.");
            msg.channel.send(embed);
            let msgs = await msg.channel.awaitMessages(filter, { max: 1, time: qTime, errors: ['time'] });
            let reply = msgs.first().content;
            if (reply.length < 50) {
                await msg.react("✅");
                await msg.react("❌");
                return msg.channel.embed("The response must be at least 50 characters long. Please re-react and try again.");
            }
            else acceptDeathEater(member, reply, user);
        } else if (!accepting && passing) {
            //Needs explanation
            embed.setColor("RED");
            embed.setDescription("You are denying " + member.displayName + "'s application for Death Eater, although they meet at least " + (PERCENTREQ * 100) + "% of the requirements, so **an explanation is required.**\n\nPlease respond to this message with a thorough explanation of why this user is not being accepted despite meeting the requierments.");
            msg.channel.send(embed);
            let msgs = await msg.channel.awaitMessages(filter, { max: 1, time: qTime, errors: ['time'] });
            let reply = msgs.first().content;
            if (reply.length < 50) {
                await msg.react("✅");
                await msg.react("❌");
                return msg.channel.embed("The response must be at least 50 characters long. Please re-react and try again.");
            }
            else denyDeathEater(member, reply, user);
        } else if (!accepting && !passing) {
            //Makes sense
            embed.setColor("GREEN");
            embed.setDescription("You are denying " + member.displayName + "'s application for Death Eater, and they do not meet at least " + (PERCENTREQ * 100) + "% of the requirements, so **no explanation is needed.**\n\nIf you want to leave a comment, feel free to do so, otherwise simply respond to this message with `NA`.");
            msg.channel.send(embed);
            let msgs = await msg.channel.awaitMessages(filter, { max: 1, time: qTime, errors: ['time'] });
            let reply = msgs.first().content;
            denyDeathEater(member, reply.trim().toLowerCase() === "na" ? "" : reply, user);
        }

    } catch(e) {
        console.log(e)
    }

    async function acceptDeathEater(member, reply, staffUser) {
        let dm = await member.createDM();
        if (!dm) return msg.channel.embed("This user has DMs turned off. Please ask them to enable it and then re-react to restart.");

        //GIVE ROLE
        member.addRole("283272728084086784");

        let embed2 = new Discord.RichEmbed();
        embed2.setAuthor("Approved by " + staffUser.username, staffUser.avatarURL);
        embed2.setDescription(reply === "" ? "**You met the requirements and have been approved for DE!**" : reply + "\n\n**You have been approved for DE!**");
        embed2.setFooter("If you have any questions, simply reply to this and make sure your message has a ? at the end.");
        dm.send(embed2);

        embed2.setAuthor(member.displayName + " approved by " + staffUser.username, member.user.avatarURL);
        embed2.setFooter("If you have any follow up comments, send " + member.user.id + " [comment] in <#470406723572596746>");
        msg.channel.send(embed2);
        await msg.react("✅");
        await msg.react("❌");
        await msg.react("👍");
    }

    async function denyDeathEater(member, reply, staffUser) {
        let dm = await member.createDM();
        if (!dm) return msg.channel.embed("This user has DMs turned off. Please ask them to enable it and then re-react to restart.");

        //REMOVE ROLE (JUST IN CASE)
        member.removeRole("283272728084086784");

        let embed2 = new Discord.RichEmbed();
        embed2.setAuthor("Denied by " + staffUser.username, staffUser.avatarURL);
        embed2.setDescription(reply === "" ? "**You did not meet the requirements for DE.**" : reply + "\n\n**Your application for DE has been denied.**");
        embed2.setFooter("If you have any questions, simply reply to this and make sure your message has a ? at the end.");
        dm.send(embed2);

        embed2.setAuthor(member.displayName + " denied by " + staffUser.username, member.user.avatarURL);
        embed2.setFooter("If you have any follow up comments, send `" + member.user.id + " [comment]` in <#470406723572596746>");
        msg.channel.send(embed2);
        await msg.react("✅");
        await msg.react("❌");
        await msg.react("👍");
    }
}
