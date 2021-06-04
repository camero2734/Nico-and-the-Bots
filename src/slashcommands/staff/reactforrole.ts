import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import { ButtonStyle, CommandOptionType, ComponentType } from "slash-create";

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

export const Executor: CommandRunner<{ text: string; role: Snowflake }> = async (ctx) => {
    const { text, role } = ctx.opts;

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
        const member = await ctx.channel.guild.members.fetch(btnCtx.user.id as Snowflake);
        if (!member) return;

        const embed = new MessageEmbed().setDescription(`You now have the ${roleObj.name} role!`);

        await member.roles.add(roleObj.id);
        btnCtx.send({ ephemeral: true, embeds: [embed.toJSON() as Record<string, unknown>] });
    });

    ctx.registerComponent(`remove_role`, async (btnCtx) => {
        const member = await ctx.channel.guild.members.fetch(btnCtx.user.id as Snowflake);
        if (!member) return;

        const embed = new MessageEmbed().setDescription(`You no longer have the ${roleObj.name} role!`);

        await member.roles.remove(roleObj.id);
        btnCtx.send({ ephemeral: true, embeds: [embed.toJSON() as Record<string, unknown>] });
    });
};
