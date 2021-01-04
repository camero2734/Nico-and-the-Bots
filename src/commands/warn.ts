import { prefix } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { GuildMember, Message, MessageEmbed } from "discord.js";
import { MessageTools } from "helpers";
import { Connection, MoreThan } from "typeorm";

export default new Command({
    name: "warn",
    description: "Warns a user",
    category: "Staff",
    usage: "!warn [@user] [description] [category + severity]",
    example: "!warn @poot eating too many flaming hot cheetos b9",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        //GET INFO
        const member = msg?.mentions?.members?.first();

        if (!member) throw new CommandError("No valid user mentioned");

        let severity = 0;
        let rule = "";

        // Determine if some information was already inputted
        if (msg.content.split(" ").slice(2).length > 0) {
            // A 9, A9, 9 A, 9A at end all valid
            const regex = /(?<rule>[BDSNObdsno]) {0,1}(?<severity>\d{1,2})+$|(?<severity2>\d{1,2})+ {0,1}(?<rule2>[BDSNObdsno])$/;
            const result = regex.exec(msg.content);
            if (result?.groups) {
                severity = parseInt(
                    result.groups.severity === undefined ? result.groups.severity2 : result.groups.severity
                );
                rule = result.groups.rule === undefined ? result.groups.rule2 : result.groups.rule;

                if (severity !== undefined || rule !== undefined) {
                    msg.content = msg.content.replace(regex, "");
                }
            }
        }

        let explanation: string | null = msg.content.split(" ").slice(2).join(" ");
        if (explanation === "") explanation = null;

        const embed = new MessageEmbed()
            .setFooter(`Initiated by ${msg.member.displayName} [2 minutes to respond]`, msg.author.displayAvatarURL())
            .setAuthor(`Creating warning for ${member.displayName}`, member.user.displayAvatarURL());

        if (!explanation) {
            embed.setDescription(
                "Please input the warning message. Remember to include all relevant details, including any changes the user needs to make."
            );
            const m = await msg.channel.send(embed);
            const content_msg = await MessageTools.awaitMessage(msg, 120000);
            if (!content_msg) throw new CommandError("I didn't hear back from you in time");

            await new Promise((next) => setTimeout(next, 300));
            await content_msg.delete();
            await m.delete();
            explanation = content_msg.content;
        }

        const rules = ["Bothering Others", "Drama", "Spam", "NSFW/Slurs", "Other"];

        if (!rule) {
            const askForRule = async (_in = "") => {
                const newEmbed = new MessageEmbed(embed);
                newEmbed.setDescription(
                    `${_in}What rule did the user break? Please refer to the list below and respond with the **letter** of the rule broken.`
                );

                for (const _r of rules) {
                    newEmbed.addField(`${_r[0]}.`, _r);
                }
                const m = await msg.channel.send(newEmbed);
                const rule_msg = await MessageTools.awaitMessage(msg, 120000);
                if (!rule_msg) throw new CommandError("I didn't hear back from you in time");

                await new Promise((next) => setTimeout(next, 300));
                await rule_msg.delete();
                await m.delete();
                rule = rule_msg.content.toUpperCase();
                if (!rules.some((_r) => _r.startsWith(<string>rule)))
                    await askForRule("Invalid letter. Try again.\n\n");
            };
            await askForRule();
        }

        if (!severity || severity < 1 || severity > 10) {
            const askForSev = async (_in = "") => {
                embed.setDescription(
                    `${_in}What severity was this action? Please rate it between **1** and **10**, with 1 being a very small warning, and 10 being a very serious warning.`
                );
                const m = await msg.channel.send(embed);

                const sev_msg = await MessageTools.awaitMessage(msg, 120000);
                if (!sev_msg) throw new CommandError("I didn't hear back from you in time");

                await new Promise((next) => setTimeout(next, 300));
                await sev_msg.delete();
                await m.delete();
                severity = parseInt(sev_msg.content.toUpperCase());
                if (isNaN(severity) || severity < 1 || severity > 10) await askForSev("Invalid number. Try again.\n\n");
            };
            await askForSev();
        }

        const confirmationEmbed = new MessageEmbed(embed);
        confirmationEmbed.setTitle("Would you like to submit this warning?");
        confirmationEmbed.addField("Explanation", explanation);
        confirmationEmbed.addField(
            "Rule Broken",
            rules.find((_r) => _r.startsWith(rule.toUpperCase()))
        );
        confirmationEmbed.addField("Severity", severity);
        const con_m = await msg.channel.send(confirmationEmbed);

        const confirmation_msg = await MessageTools.awaitMessage(msg, 120000);
        if (!confirmation_msg) throw new CommandError("I didn't hear back from you in time");

        await new Promise((next) => setTimeout(next, 300));
        await confirmation_msg.delete();
        await con_m.delete();

        if (confirmation_msg.content.toLowerCase().indexOf("yes") !== -1) {
            confirmationEmbed.setTitle("Warning submitted.");
            await msg.channel.send(confirmationEmbed);

            //DM WARNED USER
            try {
                const dm = await member.createDM();
                confirmationEmbed.setTitle("You have received a warning");
                confirmationEmbed.setAuthor(member.displayName, member.user.displayAvatarURL());
                confirmationEmbed.setFooter(
                    `Initiated by ${msg.member.displayName} || Please refrain from committing these infractions again. Any questions can be directed to the staff!`,
                    msg.author.displayAvatarURL()
                );
                await dm.send(confirmationEmbed);
            } catch (e) {
                await msg.channel.send(
                    "> Unable to DM user about their warning, you may want to message them so they are aware"
                );
            }

            //INSERT WARNING TO DATABASE
            const warnData = {
                edited: false,
                given: msg.author.id,
                channel: msg.channel.id,
                rule: rules.find((_r) => _r.startsWith(rule.toUpperCase())),
                severity,
                content: explanation
            };
            const warn = new Item({
                id: member.id,
                title: JSON.stringify(warnData),
                type: "Warning",
                time: Date.now()
            });
            await connection.manager.save(warn);
            autoJailCheck(member);
        } else throw new CommandError("Warning cancelled. Use !warn to start again.");

        async function autoJailCheck(member: GuildMember) {
            const allWarns = await connection.getRepository(Item).find({
                id: member.id,
                type: "Warning",
                time: MoreThan(new Date("16 March 2020 22:00").getTime())
            });
            if (allWarns.length >= 3) autoJail(member);
            else {
                const embed = MessageTools.textEmbed(
                    `${Math.max(0, 3 - allWarns.length)} more warning${
                        allWarns.length === 1 ? "" : "s"
                    } until this user is auto-jailed.`
                );
                await msg.channel.send(embed);
            }
        }

        async function autoJail(member: GuildMember) {
            // Hooks into !suggest to send a suggestion
            const m = new Message(
                msg.client,
                {
                    content: `${prefix}jail ${member}`,
                    type: `DEFAULT`,
                    author: msg.author,
                    embeds: [],
                    attachments: [],
                    mentions: [member.user],
                    timestamp: Date.now(),
                    id: msg.id
                },
                msg.channel
            );

            await Command.runCommand(m, connection);
        }
    }
});
