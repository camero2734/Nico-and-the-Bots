import { prefix } from "configuration/config";
import { Command, CommandMessage } from "configuration/definitions";
import { Message, MessageEmbed } from "discord.js";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

export default new Command({
    name: "pronoun",
    description: "Get a pronoun role",
    category: "Roles",
    usage: "!pronoun [pronoun]",
    example: "!pronoun they/them",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const pronouns = {
            "724816436304019536": ["he", "him", "his"],
            "724816755809058826": ["she", "her", "hers"],
            "724816785290821893": ["they", "them", "their"]
        };

        const getStrictKeys = <T>(obj: T) => Object.keys(obj) as (keyof T)[];

        const requested =
            msg.argsString
                ?.split(/[ /,]/g)
                ?.filter((p) => p !== "")
                ?.map((p) => p.toLowerCase()) || [];

        console.log(requested, /REQUESTED/);

        const giving: string[] = [];
        const notfound: string[] = [];

        for (const r of requested) {
            const role = getStrictKeys(pronouns).find((id) => pronouns[id].includes(r));
            if (!role) notfound.push(r);
            else if (!giving.includes(role)) giving.push(role);
        }

        if (requested.length === 0) removeRoles();
        else if (notfound.length > 0) handleNotFound();
        else confirmRoles();

        async function handleNotFound(): Promise<void> {
            const willGive = giving.length > 0;
            let embed = new MessageEmbed()
                .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                .setDescription(
                    `We currently don't have ${notfound.length === 1 ? "a role" : "roles"} for \`${notfound.join(
                        ", "
                    )}\`. Would you like to request it? If not, you will ${
                        willGive ? "continue" : "exit"
                    } modifying roles.`
                )
                .setFooter("Respond with yes or no. You have 60 seconds.");

            await msg.channel.send(embed);
            let addResponse;
            try {
                addResponse = await MessageTools.awaitMessage(msg, 60 * 1000);
                if (!addResponse?.content) throw new Error("No message content");
            } catch (e) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription("You didn't reply in time, so you'll have to use `!pronoun` again");
                msg.channel.send(embed);
                return;
            }

            if (addResponse.content.toLowerCase().includes("yes")) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(
                        `Your pronouns have been sent to the staff to be approved and added! You will be notified via DMs when there's an update to your request. ${
                            willGive ? "You can continue modifying your other requested pronoun roles." : ""
                        }`
                    );
                await sendRequestToStaff(notfound);
                await msg.channel.send(embed);
            } else if (addResponse.content.toLowerCase().includes("no")) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(
                        `No request was sent. ${
                            willGive ? "You can continue adding your other requested pronoun roles." : ""
                        }`
                    );
                await msg.channel.send(embed);
            } else {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(
                        `Well, that wasn't a \`yes\` or \`no\`, but I'll take it as a no. ${
                            willGive ? "You can continue adding your other requested pronoun roles." : ""
                        }`
                    );
                await msg.channel.send(embed);
            }
            await new Promise((next) => setTimeout(next, 750));
            if (willGive) confirmRoles();
        }

        async function confirmRoles() {
            const roles = giving.map((g) => msg.guild.roles.cache.get(g)?.name);
            let embed = new MessageEmbed()
                .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                .setFooter("Respond with yes or no. You have 60 seconds.");

            embed.setDescription(
                `Would you like to have the following pronoun role${
                    roles.length === 1 ? "" : "s"
                }?\n\`\`\`fix\n${roles.join("\n")}\`\`\``
            );

            await msg.channel.send(embed);

            let confirmResponse;
            try {
                confirmResponse = await MessageTools.awaitMessage(msg, 60 * 1000);
                if (!confirmResponse?.content) throw new Error("No message content");
            } catch (e) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription("You didn't reply in time, so you'll have to use `!pronoun` again");
                return msg.channel.send(embed);
            }

            if (confirmResponse.content.toLowerCase().includes("yes")) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(`Your pronouns have been updated!`);

                // Remove old roles
                await msg.member.roles.remove(Object.keys(pronouns));

                await new Promise((next) => setTimeout(next, 600));

                // Add requested ones
                await msg.member.roles.add(giving);

                await msg.channel.send(embed);
            } else if (confirmResponse.content.toLowerCase().includes("no")) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(`Your pronoun roles were not updated.`);
                await msg.channel.send(embed);
            } else {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(
                        `Well, that wasn't a \`yes\` or \`no\`, but I'll take it as a no. Use \`!pronoun\` to restart.`
                    );
                await msg.channel.send(embed);
            }
        }

        async function removeRoles() {
            let hasPronouns = false;
            for (const p in pronouns) {
                if (msg.member.roles.cache.get(p)) {
                    hasPronouns = true;
                    break;
                }
            }
            if (!hasPronouns) {
                const embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(
                        `You don't have any pronouns to remove! To update pronoun roles, simply say \`!pronoun he they\` (you would remove he/him and they/them roles).\n\n**Make sure to list *all* pronouns you want - even if you already have it!**`
                    );
                return msg.channel.send(embed);
            }
            let embed = new MessageEmbed()
                .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                .setFooter("Respond with yes or no. You have 60 seconds.")
                .setDescription(`Would you like to remove all of your pronoun roles?`);

            await msg.channel.send(embed);

            let deleteResponse;
            try {
                deleteResponse = await MessageTools.awaitMessage(msg, 60 * 1000);
                if (!deleteResponse?.content) throw new Error("No message content");
            } catch (e) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription("You didn't reply in time, so you'll have to use `!pronoun` again");
                return msg.channel.send(embed);
            }

            if (deleteResponse.content.toLowerCase().includes("yes")) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(`All of your pronoun roles have been removed!`);

                // Remove roles
                await msg.member.roles.remove(Object.keys(pronouns));

                await msg.channel.send(embed);
            } else if (deleteResponse.content.toLowerCase().includes("no")) {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(`Your pronoun roles were not updated.`);
                await msg.channel.send(embed);
            } else {
                embed = new MessageEmbed()
                    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
                    .setDescription(
                        `Well, that wasn't a \`yes\` or \`no\`, but I'll take it as a no. Use \`!pronoun\` to restart.`
                    );
                await msg.channel.send(embed);
            }
        }

        async function sendRequestToStaff(roles: string[]) {
            // Hooks into !suggest to send a suggestion
            const m = new Message(
                msg.client,
                {
                    content: `${prefix}suggest [AUTO] Add pronoun roles: \`${roles.join("`, `")}\``,
                    type: `DEFAULT`,
                    author: msg.author,
                    embeds: [],
                    attachments: [],
                    mentions: [],
                    timestamp: Date.now(),
                    id: msg.id
                },
                msg.channel
            );

            await Command.runCommand(m, connection);
        }
    }
});
