module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;
        console.log("pre")
        let subcommand = removeCommand(msg.content).split(" ").shift();
        console.log("post")
        if (!subcommand) {
            console.log("nah")
            return msg.channel.embed("Available commands: `next`, `prev`, `cur`")
        } else subcommand = subcommand.toLowerCase();
        console.log(subcommand, /SUBCOMMAND/)
        let channel = msg.guild.channels.get(chans.submittedsuggestions);
        let json = await loadJsonFile("suggestions.json");

        if (subcommand === "prev") json.index = (json.index - 1 + json.entries.length) % json.entries.length;
        if (subcommand === "next") json.index = (json.index + 1) % json.entries.length;
        if (subcommand === "cur") json.index = (json.index) % json.entries.length;

        if (!isNaN(subcommand)) json.index = (subcommand-1+json.entries.length) % json.entries.length;

        let index = json.index;
        if (json.entries.length > 0) {
            let entry = json.entries[index];
            if (json.index >= json.entries.length) json.index = 0;
            let embed = new Discord.RichEmbed();
            embed.setColor(entry.planned ? "#00ff00" : "ff0000");
            let member = msg.guild.members.get(entry.user);
            embed.setTitle(`Viewing suggestion #${index + 1}/${json.entries.length}`);
            if (member) embed.setAuthor(member.displayName, member.user.displayAvatarURL);
            embed.setFooter(`[🏁 completed, ✅ planned, ⚠ unclear, ❌ not planned] | In: ` + entry.channel + " | At: " + (new Date(entry.date)).toString());
            embed.setDescription(entry.content);
            await writeJsonFile("suggestions.json", json);
            let m = await msg.channel.send(embed);
            if (!entry.planned) {
                await m.react("🏁");
                await m.react("✅");
                await m.react("⚠");
                await m.react("❌");
            } else await m.react("🏁");

            const filter = (reaction, user) => {
                return !user.bot;
            }
            try {
                if (typeof collector !== "undefined" && collector.message) await collector.message.clearReactions();
                if (typeof collector !== "undefined" && collector.end) collector.stop();
                collector = m.createReactionCollector(filter);
                collector.on('collect', async (r, user) => {
                    let dm = await member.createDM();
                    console.log("emoji gotten")
                    if (r.emoji.name === "🏁") {
                        dm.embed("Your suggestion has been marked as completed!");
                        dm.embed("Your suggestion: " + entry.content);
                        await m.clearReactions();
                        await m.react(r.emoji.name);
                        json.entries.splice(index, 1);
                        json.index = Math.max(json.index - 1, 0);
                        await writeJsonFile("suggestions.json", json);
                    }
                    else if (r.emoji.name === "✅") {
                        console.log("check")
                        dm.embed("Your suggestion has been marked as planned!");
                        dm.embed("Your suggestion: " + entry.content);
                        await m.clearReactions();
                        await m.react(r.emoji.name);
                        json.entries[index].planned = true;
                        await writeJsonFile("suggestions.json", json);
                    } else if (r.emoji.name === "⚠") {
                        console.log("warning")
                        dm.embed("Your suggestion has been marked as questionable/needs further explanation. Please resubmit your suggestion with more clarifying details.");
                        dm.embed("Your suggestion: " + entry.content);
                        await m.clearReactions();
                        await m.react(r.emoji.name);
                        json.entries.splice(index, 1);
                        json.index = Math.max(json.index - 1, 0);
                        await writeJsonFile("suggestions.json", json);
                    } else if (r.emoji.name === "❌") {
                        console.log("x")
                        dm.embed("Your suggestion has been marked as not planned. If you feel it should be reconsidered, feel free to resubmit with more details!");
                        dm.embed("Your suggestion: " + entry.content);
                        await m.clearReactions();
                        await m.react(r.emoji.name);
                        json.entries.splice(index, 1);
                        json.index = Math.max(json.index - 1, 0);
                        await writeJsonFile("suggestions.json", json);
                    }
                    msg.channel.embed("If you would like to add a description or explanation, prefix your message with their userid:\n`" + entry.user + "`")
                });
            } catch (e) {
                console.log("caught an error ")
            }


        } else {
            if (json.index !== 0) {
                json.index = 0;
                await writeJsonFile("suggestions.json", json);
            }
            await msg.channel.embed("There are no available suggestions!")
        }
    },
    info: {
        aliases: false,
        example: "!s [subcommand]",
        minarg: 0,
        description: "Cycles through submitted suggestions",
        category: "Staff",
    }
}


// {
//     (async function() {
//         let members = msg.guild.roles.get("465268535543988224").array(); 
//         for (let member of members) await member.removeRole("465268535543988224");
//     })()
    
// }