module.exports = {
    execute: async function (msg) {
        if (msg.member.hasPermission("BAN_MEMBERS") && msg && msg.mentions && msg.mentions.members && msg.mentions.members.first()) {
            let overview = msg.content.toLowerCase().indexOf("overview") !== -1 ? true : false;
            let member = msg.mentions.members.first();
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            sendWarns(member, page, overview, false);
        } else if (msg.member.hasPermission("BAN_MEMBERS") && !isNaN(msg.args[1])) {
            let overview = msg.content.toLowerCase().indexOf("overview") !== -1 ? true : false;
            let member ={ id: msg.args[1] };
            if (msg.guild.members.get(member.id)) member = msg.guild.members.get(member.id);
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            sendWarns(member, page, overview, false);
        } else if (msg.member.hasPermission("BAN_MEMBERS") && msg.args[1]) {
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            let members = msg.guild.members.array();
            let matches = fuzzyMatch(members, removeCommand(msg.content), { key: "displayName" });
            if (matches.length > 0) sendWarns(matches[0], page, false, false);
            else return msg.channel.embed("No matches found!");
        } else {
            let member = msg.member;
            let page = msg.args[1] && !isNaN(msg.args[1]) ? msg.args[1] - 1 : 0;
            sendWarns(member, page, false, true);
        }

        async function sendWarns(member, page, overview, type) {
            overview = false; // TODO: Fix?
            let perpage = 5;
            let warnNum = 0;
            let lastWarn = 0;
            let userWarns = await connection.getRepository(Item).find({ id: member.id, type: "Warning" });
            userWarns = userWarns.sort((a,b) => b.time - a.time);
            let pagedWarns = userWarns.slice(page * perpage, page * perpage + perpage);
            if (pagedWarns.length === 0) {
                let pageCount = Math.ceil(userWarns.length/perpage);
                if (pageCount === 0) return msg.channel.embed("This user has no warnings.");
                else return msg.channel.embed("This page does not exist. The user has " + pageCount + " page(s).");
            }
            else warnNum = userWarns.length, lastWarn = userWarns[0].date;
            let embed = new Discord.RichEmbed();
            embed.setColor("RANDOM");
            if (member.displayName && member.user) embed.setAuthor(member.displayName, member.user.displayAvatarURL);
            embed.setFooter(bot.user.username, bot.user.displayAvatarURL);
            embed.setTitle("Page " + (parseInt(page) + 1));
            let severityArr = [0, 0];
            let i = 0;
            for (let warn of pagedWarns) {
                let d1 = new Date(warn.time);
                let data = { content: warn.title, rule: "N/A", severity: "N/A"};
                try {
                    data = JSON.parse(warn.title);
                    severityArr[0] += data.severity;
                    severityArr[1]++;
                } catch (e) {}
                let header = `${i + 1}. ${friendlyTime(d1)} [${d1.toString().split(" GMT")[0].split(" ").slice(1).join(" ")} CT]`;
                let content = `**${data.content}**\nRule broken: \`${data.rule}\`\nSeverity: \`${data.severity}\``;
                embed.addField(header, content);
                i++;
            }

            if (overview) {
                embed.addField("# of warns", warnNum);
                embed.addField("Last warn", new Date(lastWarn));
                embed.addField("Average Severity", severityArr[0]/severityArr[1]);
            } else {
                let warnsUntilJail = await getWarnsUntilJail(member.id);
                embed.setFooter("Press the reaction # to see more information about a warning, or to edit or delete the warning. [within a minute]\nWarns until auto-jailed: " + warnsUntilJail);
                // embed.setFooter("Average Severity: " + (severityArr[0]/severityArr[1]) + ", # of warns: " + warnNum, bot.user.displayAvatarURL);
            }
            if (type) {
                embed.setFooter("Average Severity: " + (severityArr[0]/severityArr[1]) + ", # of warns: " + warnNum, bot.user.displayAvatarURL);
                let dm = await member.createDM();
                await dm.send(embed);
            }
            else {
                let m = await msg.channel.send(embed);

                let reactions = ['1⃣', "2⃣", '3⃣', "4⃣", "5⃣"];
                console.log(i, /I VALUE/)
                for (let j = 0; j < Math.min(5, i); j++) {
                    await m.react(reactions[j]);
                }
                const filter = (reaction, user) => reactions.indexOf(reaction.emoji.name) !== -1 && user.id === msg.author.id;
                const collector = m.createReactionCollector(filter, { time: 60000, maxEmojis: 1 });
                collector.on('collect', async r => {
                    await m.clearReactions();
                    let number = parseInt(r.emoji.name.substring(0,1));
                    let chosenWarn = pagedWarns[number - 1];
                    console.log("json2");
                    let chosenData = JSON.parse(chosenWarn.title);
                    let detailedEmbed = new Discord.RichEmbed();
                    detailedEmbed.setAuthor(member.displayName, member.user.displayAvatarURL);
                    detailedEmbed.setFooter("React with 🖊️ to edit, 🗑️ to delete [within a minute]", bot.user.displayAvatarURL);
                    detailedEmbed.addField("Explanation", chosenData.content);
                    detailedEmbed.addField("Rule Broken", chosenData.rule);
                    detailedEmbed.addField("Severity", chosenData.severity);
                    detailedEmbed.addField("Warned by", msg.guild.members.get(chosenData.given) || "Detail Unavailable");
                    detailedEmbed.addField("Given in channel", msg.guild.channels.get(chosenData.channel) || "Detail Unavailable");
                    detailedEmbed.addField("Edited", chosenData.edited ? "Yes" : "No");
                    let detailed_m = await msg.channel.send(detailedEmbed);

                    await detailed_m.react("🖊️");
                    await detailed_m.react("🗑️");

                    const filter2 = (reaction, user) => ["🖊️", "🗑️"].indexOf(reaction.emoji.name) !== -1 && user.id === msg.author.id;
                    const collector2 = detailed_m.createReactionCollector(filter2, { time: 60000, maxEmojis: 1 });

                    collector2.on('collect', async r2 => {
                        await detailed_m.clearReactions();
                        if (member.highestRole.position >= msg.member.highestRole.position) return msg.channel.embed("You cannot edit or delete a warning from someone of equal or higher role ranking.")
                        if (r2.emoji.name === "🖊️") {
                            await editWarning(chosenWarn, chosenData);
                        } else if (r2.emoji.name === "🗑️") {
                            await deleteWarning(chosenWarn);
                        }
                    });
                });
                collector.on('end', async collected => {
                    if (!m.deleted) {
                        await m.clearReactions();
                    }
                });
            }
        }

        async function editWarning(chosenWarn, chosenData) {
            console.log(chosenWarn);
            let editEmbed = new Discord.RichEmbed({title: "Please copy, paste, and edit the following text. Ensure each item stays on its own line."});
            let editText = `explanation: ${chosenData.content}\nrule: ${chosenData.rule}\nseverity: ${chosenData.severity}`
            editEmbed.setDescription(`\`\`\`${editText}\`\`\``);
            editEmbed.setFooter("You have 2 minutes to edit. Send the edited text back to finish.")
            let edit_m = await msg.channel.send(editEmbed);

            let editedText = await msg.channel.awaitMessage(msg.member, null, 120000);

            if (editedText.content.indexOf(":") === -1) return;

            let categories = editedText.content.split("\n");

            let newText = categories.find(c => c.startsWith("explanation:")).split(":").slice(1).join(":").trim();
            let newSeverity = categories.find(c => c.startsWith("severity:")).split(":").slice(1).join(":").trim();
            let newRule = categories.find(c => c.startsWith("rule:")).split(":").slice(1).join(":").trim();

            let rules = ["Bothering Others", "Drama", "Spam", "NSFW/Slurs", "Other"];
            chosenData.content = newText;
            chosenData.severity = newSeverity;
            chosenData.rule = rules.find(r => r.startsWith(newRule.substring(0, 1)));

            if (isNaN(chosenData.severity) || chosenData.severity < 1 || chosenData.severity > 10 || rules.indexOf(chosenData.rule) === -1) {
                await edit_m.delete();
                await editedText.delete();
                await msg.channel.send("Improperly entered information. Please try again.");
                return await editWarning(chosenWarn, chosenData);
            }

            let confirm_embed = new Discord.RichEmbed();
            confirm_embed.setTitle("Is this correct?");
            confirm_embed.setFooter("If you changed your mind and do not want to edit, simply do not reply.")
            confirm_embed.setDescription(`**${chosenData.content}**\nRule broken: \`${chosenData.rule}\`\nSeverity: \`${chosenData.severity}\``);

            let confirm_m = await msg.channel.send(confirm_embed);

            let confirm_response = await msg.channel.awaitMessage(msg.member, null, 120000);

            if (confirm_response.content.toLowerCase().indexOf("yes") !== -1) {
                chosenData.edited = true;
                chosenWarn.title = JSON.stringify(chosenData);
                await connection.manager.save(chosenWarn);
                await msg.channel.embed("Warning edited.");
                return;
            } else {
                await edit_m.delete();
                await editedText.delete();
                await msg.channel.send("Warning not edited. Try again.");
                return await editWarning(chosenWarn, chosenData);
            }
        }

        async function deleteWarning(chosenWarn) {
            let sent_msg = await msg.channel.send(new Discord.RichEmbed({title: "Are you sure you want to delete this warning?", footer: {text: "Reply yes or no [2 minutes to respond]"}}));
            let confirmation_msg = await msg.channel.awaitMessage(msg.member, null, 120000);
            await new Promise(next => setTimeout(next, 300));
            await sent_msg.delete();
            if (confirmation_msg.content.toLowerCase().indexOf("yes") !== -1) {
                await connection.manager.remove(chosenWarn);
                await msg.channel.embed("Warning deleted");
            } else await msg.channel.embed("Warning NOT deleted");
        }

        async function getWarnsUntilJail(id) {
            const allWarns = await connection.getRepository(Item).find({id: id, type: "Warning", time: typeorm.MoreThan((new Date("16 March 2020 22:00")).getTime())});
            let warnsLeft = 0;
            if (allWarns.length >= 3) {
                return`0 (Jail #${allWarns.length - 1})`
            } else return `${3 - allWarns.length} (Jail #1)`;
        }

    },
    info: {
        aliases: ["chkwarn", "checkwarn", "cw", "chkwarns", "checkwarns", "warns", "overview"],
        example: "!chkwarn (@ user)",
        minarg: 0,
        description: "Checks warnings",
        category: "Info"
    }
};

/* OLD
if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.send("```You must be an Admin or Moderator to use this command```")

        if (!msg.args || !msg.args[1]) return this.embed(msg);
        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg);

        let member = msg.mentions.members.first();

        ...all(`SELECT * FROM warn WHERE userid = "${member.id}" ORDER BY date DESC LIMIT 25`).then((rows) => {
            //var usrname = bot.users.get(row.userId).username
            let embed = new Discord.RichEmbed().setColor("RANDOM").setAuthor(member.displayName, member.user.displayAvatarURL).setFooter(bot.user.username, bot.user.displayAvatarURL);
            for (let row of rows) {
                let date = new Date(row.date)

                var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                let day = date.getDate() < 10 ? '0' + date.getDate().toString()  : date.getDate().toString()

                embed.addField(row.warning ? row.warning.replace(/<@!{0,1}\d{18}>/g, "").substring(0, 254) : "CORRUPTED_FIELD", `Date: ${day + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ' (CT)'}\n`)

            }
            msg.channel.send(embed);
        });
*/
