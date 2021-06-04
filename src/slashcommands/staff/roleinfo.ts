import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Retrieves information for a role",
    options: [
        {
            name: "role",
            description: "The role to look up information for",
            required: true,
            type: CommandOptionType.ROLE
        }
    ]
};

export const Executor: CommandRunner<{ role: Snowflake }> = async (ctx) => {
    const role = ctx.channel.guild.roles.cache.get(ctx.opts.role);
    if (!role) throw new CommandError("A valid role was not provided.");

    const embed = new MessageEmbed();
    embed.setTitle(role.name);
    embed.setColor(role.hexColor);
    embed.addField("Hex", role.hexColor);
    embed.addField("Members", `${role.members.size}`);
    embed.addField("Created", `${role.createdAt}`);
    embed.addField("ID", role.id);

    await ctx.send({ embeds: [embed.toJSON() as Record<string, unknown>] });
};
