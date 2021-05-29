import { CommandError, CommandOptions, CommandReactionHandler, CommandRunner } from "configuration/definitions";
import { Message, MessageEmbed, TextChannel } from "discord.js";
import { ButtonStyle, CommandOptionType, ComponentType } from "slash-create";
import F from "helpers/funcs";

export const Options: CommandOptions = {
    description: "Creates a message that users can react to to receive a role",
    options: [
        {
            name: "text",
            description: "The description text for the embed",
            required: true,
            type: CommandOptionType.STRING
        },
        {
            name: "role",
            description: "The role the interaction should give",
            required: true,
            type: CommandOptionType.ROLE
        },
        {
            name: "channel",
            description: "The channel to send it in (defaults to current channel)",
            required: false,
            type: CommandOptionType.STRING
        }
    ]
};

export const Executor: CommandRunner<{ channel?: string; text: string; role: string; reaction: string }> = async (
    ctx
) => {
    const { channel, text, role, reaction } = ctx.opts;

    const roleObj = await ctx.channel.guild.roles.fetch(role);
    if (!roleObj) throw new CommandError("Invalid role given");

    await ctx.defer();

    await ctx.send(text, {
        components: [
            {
                type: ComponentType.ACTION_ROW,
                components: [
                    {
                        type: ComponentType.BUTTON,
                        style: ButtonStyle.SUCCESS,
                        label: `Get the ${roleObj.name} role`,
                        custom_id: `add_role`,
                        emoji: {
                            name: "😎"
                        }
                    },
                    {
                        type: ComponentType.BUTTON,
                        style: ButtonStyle.DESTRUCTIVE,
                        label: `Remove the ${roleObj.name} role`,
                        custom_id: `remove_role`,
                        emoji: {
                            name: "😔"
                        }
                    }
                ]
            }
        ]
    });

    ctx.registerComponent(`add_role`, async (btnCtx) => {
        const member = await ctx.channel.guild.members.fetch(btnCtx.user.id);
        if (!member) return;

        const embed = new MessageEmbed().setDescription(`You now have the ${roleObj.name} role!`);

        await member.roles.add(roleObj.id);
        btnCtx.send({ ephemeral: true, embeds: [embed.toJSON()] });
    });

    ctx.registerComponent(`remove_role`, async (btnCtx) => {
        const member = await ctx.channel.guild.members.fetch(btnCtx.user.id);
        if (!member) return;

        const embed = new MessageEmbed().setDescription(`You no longer have the ${roleObj.name} role!`);

        await member.roles.remove(roleObj.id);
        btnCtx.send({ ephemeral: true, embeds: [embed.toJSON()] });
    });
};

// export const ReactionHandler: CommandReactionHandler = async ({ reaction, user }): Promise<boolean> => {
//     const msg = reaction.message;

//     if (user.bot) return false;

//     // Verify reaction is to this command
//     const footerBase64 = msg?.embeds?.[0]?.footer?.text;
//     if (!footerBase64 || !footerBase64.startsWith("Metadata: ")) return false;

//     const buffer = Buffer.from(footerBase64.split("Metadata: ")[1], "utf16le");
//     const footer = buffer.toString("utf-8");

//     if (!footer || !footer?.startsWith("reactforrole:")) return false;

//     try {
//         const [emoji, tempRoleID] = footer.split("reactforrole:")[1].split("|||");
//         const roleID = tempRoleID.split("|")[0];
//         // prettier-ignore
//         if (!emoji.includes(reaction.emoji.identifier) && reaction.emoji.name !== emoji && reaction.emoji.name !== "❌") {
//             return true; // Not the correct emoji
//         }

//         const member = await reaction.message.guild?.members.fetch(user.id);
//         if (!member) return true; // Handled, but member doesn't exist (somehow)

//         if (reaction.emoji.name === "❌") await member.roles.remove(roleID.trim());
//         else await member.roles.add(roleID.trim());
//     } catch (e) {
//         console.log(e, /REACTION_HANDLE_ERR/);
//         return true;
//     }

//     return true;
// };
