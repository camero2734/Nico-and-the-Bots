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
