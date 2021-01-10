import { Command, CommandError, CommandMessage, WarningData } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { CollectorFilter, GuildMember, MessageEmbed } from "discord.js";
import { MessageTools } from "helpers";
import { Connection, MoreThan } from "typeorm";
import * as ago from "s-ago";

export default new Command({
    name: "chkwarn",
    aliases: ["listwarns", "chkw"],
    description: "Lists a user's warns",
    category: "Info",
    usage: "!chkwarn [@ user | user id] (page #)",
    example: "!chkwarn @poot",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const page = (+msg.args[1] || +msg.args[2] || 1) - 1;
        const memberID = msg?.mentions?.members?.first()?.id || msg.args.find((r) => /^\d{17,19}$/.test(r));

        if (!memberID) throw new CommandError("No valid mention or user id detected.");

        let member = await msg.guild.members.fetch(memberID);
        const overview = msg.content.toLowerCase().indexOf("overview") !== -1 ? true : false;

        // Staff member
        if (msg.member.hasPermission("BAN_MEMBERS")) sendWarns(member, page, overview, false);
        // Regular member
        else {
            member = msg.member;
            sendWarns(member, page, false, true);
        }

        async function sendWarns(member: GuildMember, page: number, overview: boolean, type: boolean) {
            overview = false; // TODO: Fix?
            const perpage = 5;
            let warnNum = 0;
            let lastWarn = 0;
            let userWarns = await connection.getRepository(Item).find({ id: member.id, type: "Warning" });
            userWarns = userWarns.sort((a, b) => b.time - a.time);
            const pagedWarns = userWarns.slice(page * perpage, page * perpage + perpage);
            if (pagedWarns.length === 0) {
                const pageCount = Math.ceil(userWarns.length / perpage);
                if (pageCount === 0) throw new CommandError("This user has no warnings.");
                else throw new CommandError("This page does not exist. The user has " + pageCount + " page(s).");
            } else {
                warnNum = userWarns.length;
                lastWarn = userWarns[0].time;
            }
            const embed = new MessageEmbed();
            embed.setColor("RANDOM");
            if (member.displayName && member.user) embed.setAuthor(member.displayName, member.user.displayAvatarURL());
            embed.setFooter(msg.client.user?.username, msg.client.user?.displayAvatarURL());
            embed.setTitle("Page " + (page + 1));
            const severityArr = [0, 0];
            let i = 0;
            for (const warn of pagedWarns) {
                const d1 = new Date(warn.time);
                let data = { content: warn.title, rule: "N/A", severity: "N/A" };
                try {
                    data = JSON.parse(warn.title);
                    severityArr[0] += +data.severity;
                    severityArr[1]++;
                } catch (e) {
                    console.log(e);
                }
                const header = `${i + 1}. ${ago(d1)} [${d1
                    .toString()
                    .split(" GMT")[0]
                    .split(" ")
                    .slice(1)
                    .join(" ")} CT]`;
                const content = `**${data.content}**\nRule broken: \`${data.rule}\`\nSeverity: \`${data.severity}\``;
                embed.addField(header, content);
                i++;
            }

            if (overview) {
                embed.addField("# of warns", warnNum);
                embed.addField("Last warn", new Date(lastWarn));
                embed.addField("Average Severity", severityArr[0] / severityArr[1]);
            } else {
                const warnsUntilJail = await getWarnsUntilJail(member.id);
                embed.setFooter(
                    "Press the reaction # to see more information about a warning, or to edit or delete the warning. [within a minute]\nWarns until auto-jailed: " +
                        warnsUntilJail
                );
                // embed.setFooter("Average Severity: " + (severityArr[0]/severityArr[1]) + ", # of warns: " + warnNum, bot.user.displayAvatarURL);
            }
            if (type) {
                embed.setFooter(
                    "Average Severity: " + severityArr[0] / severityArr[1] + ", # of warns: " + warnNum,
                    msg.client.user?.displayAvatarURL()
                );
                const dm = await member.createDM();
                await dm.send(embed);
            } else {
                const m = await msg.channel.send(embed);

                const reactions = ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣"];
                console.log(i, /I VALUE/);
                for (let j = 0; j < Math.min(5, i); j++) {
                    await m.react(reactions[j]);
                }
                const filter: CollectorFilter = (reaction, user) =>
                    reactions.indexOf(reaction.emoji.name) !== -1 && user.id === msg.author.id;
                const collector = m.createReactionCollector(filter, { time: 60000, maxEmojis: 1 });
                collector.on("collect", async (r) => {
                    await m.reactions.removeAll();
                    const number = parseInt(r.emoji.name.substring(0, 1));
                    const chosenWarn = pagedWarns[number - 1];
                    console.log("json2");
                    const chosenData: WarningData = JSON.parse(chosenWarn.title);
                    const detailedEmbed = new MessageEmbed();
                    detailedEmbed.setAuthor(member.displayName, member.user.displayAvatarURL());
                    detailedEmbed.setFooter(
                        "React with 🖊️ to edit, 🗑️ to delete [within a minute]",
                        msg.client.user?.displayAvatarURL()
                    );
                    detailedEmbed.addField("Explanation", chosenData.content);
                    detailedEmbed.addField("Rule Broken", chosenData.rule);
                    detailedEmbed.addField("Severity", chosenData.severity);
                    detailedEmbed.addField(
                        "Warned by",
                        msg.guild.members.fetch(chosenData.given) || "Detail Unavailable"
                    );
                    detailedEmbed.addField(
                        "Given in channel",
                        msg.guild.channels.cache.get(chosenData.channel) || "Detail Unavailable"
                    );
                    detailedEmbed.addField("Edited", chosenData.edited ? "Yes" : "No");
                    const detailed_m = await msg.channel.send(detailedEmbed);

                    await detailed_m.react("🖊️");
                    await detailed_m.react("🗑️");

                    const filter2: CollectorFilter = (reaction, user) =>
                        ["🖊️", "🗑️"].indexOf(reaction.emoji.name) !== -1 && user.id === msg.author.id;
                    const collector2 = detailed_m.createReactionCollector(filter2, { time: 60000, maxEmojis: 1 });

                    collector2.on("collect", async (r2) => {
                        await detailed_m.reactions.removeAll();
                        if (member.roles.highest.position >= msg.member.roles.highest.position) {
                            throw new CommandError(
                                "You cannot edit or delete a warning from someone of equal or higher role ranking."
                            );
                        }

                        if (r2.emoji.name === "🖊️") {
                            await editWarning(chosenWarn, chosenData);
                        } else if (r2.emoji.name === "🗑️") {
                            await deleteWarning(chosenWarn);
                        }
                    });
                });
                collector.on("end", async (collected) => {
                    if (!m.deleted) {
                        await m.reactions.removeAll();
                    }
                });
            }
        }

        async function editWarning(chosenWarn: Item, chosenData: WarningData): Promise<void> {
            console.log(chosenWarn);
            const editEmbed = new MessageEmbed({
                title: "Please copy, paste, and edit the following text. Ensure each item stays on its own line."
            });
            const editText = `explanation: ${chosenData.content}\nrule: ${chosenData.rule}\nseverity: ${chosenData.severity}`;
            editEmbed.setDescription(`\`\`\`${editText}\`\`\``);
            editEmbed.setFooter("You have 2 minutes to edit. Send the edited text back to finish.");
            const edit_m = await msg.channel.send(editEmbed);

            const editedText = await MessageTools.awaitMessage(msg, 120_000);

            if (!editedText || editedText.content.indexOf(":") === -1) return;

            const categories = editedText.content.split("\n");

            const newText = categories
                .find((c) => c.startsWith("explanation:"))
                ?.split(":")
                .slice(1)
                .join(":")
                .trim();
            const newSeverity = categories
                .find((c) => c.startsWith("severity:"))
                ?.split(":")
                .slice(1)
                .join(":")
                .trim();
            const newRule = categories
                .find((c) => c.startsWith("rule:"))
                ?.split(":")
                .slice(1)
                .join(":")
                .trim();

            if (!newText || !newSeverity || !newRule) return;

            const rules = ["Bothering Others", "Drama", "Spam", "NSFW/Slurs", "Other"];
            chosenData.content = newText;
            chosenData.severity = +newSeverity;
            chosenData.rule = rules.find((r) => r.startsWith(newRule.substring(0, 1))) || "";

            if (
                isNaN(chosenData.severity) ||
                chosenData.severity < 1 ||
                chosenData.severity > 10 ||
                rules.indexOf(chosenData.rule) === -1
            ) {
                await edit_m.delete();
                await editedText.delete();
                await msg.channel.send("Improperly entered information. Please try again.");
                return await editWarning(chosenWarn, chosenData);
            }

            const confirm_embed = new MessageEmbed();
            confirm_embed.setTitle("Is this correct?");
            confirm_embed.setFooter("If you changed your mind and do not want to edit, simply do not reply.");
            confirm_embed.setDescription(
                `**${chosenData.content}**\nRule broken: \`${chosenData.rule}\`\nSeverity: \`${chosenData.severity}\``
            );

            const confirm_m = await msg.channel.send(confirm_embed);

            const confirm_response = await MessageTools.awaitMessage(msg, 120_000);

            if (!confirm_response) return;

            if (confirm_response.content.toLowerCase().indexOf("yes") !== -1) {
                chosenData.edited = true;
                chosenWarn.title = JSON.stringify(chosenData);
                await connection.manager.save(chosenWarn);
                await msg.channel.send(MessageTools.textEmbed("Warning edited."));
                return;
            } else {
                await edit_m.delete();
                await editedText.delete();
                await msg.channel.send("Warning not edited. Try again.");
                return await editWarning(chosenWarn, chosenData);
            }
        }

        async function deleteWarning(chosenWarn: Item) {
            const sent_msg = await msg.channel.send(
                new MessageEmbed({
                    title: "Are you sure you want to delete this warning?",
                    footer: { text: "Reply yes or no [2 minutes to respond]" }
                })
            );
            const confirmation_msg = await MessageTools.awaitMessage(msg, 120_000);
            await new Promise((next) => setTimeout(next, 300));
            await sent_msg.delete();
            if (confirmation_msg?.content.toLowerCase().indexOf("yes") !== -1) {
                await connection.manager.remove(chosenWarn);
                await msg.channel.send(MessageTools.textEmbed("Warning deleted"));
            } else await msg.channel.send(MessageTools.textEmbed("Warning NOT deleted"));
        }

        async function getWarnsUntilJail(id: string) {
            const allWarns = await connection
                .getRepository(Item)
                .find({ id: id, type: "Warning", time: MoreThan(new Date("16 March 2020 22:00").getTime()) });
            const warnsLeft = 0;
            if (allWarns.length >= 3) {
                return `0 (Jail #${allWarns.length - 1})`;
            } else return `${3 - allWarns.length} (Jail #1)`;
        }
    }
});
