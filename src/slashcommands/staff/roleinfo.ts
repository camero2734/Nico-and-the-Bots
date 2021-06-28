import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import { CommandOptionType, MessageEmbedOptions } from "slash-create";

const names = <const>["role1", "role2", "role3", "role4", "role5"];

export const Options: CommandOptions = {
    description: "Retrieves information for a role",
    options: names.map((name, idx) => ({
        name,
        description: `Role #${idx} to look up information for`,
        required: idx === 0,
        type: CommandOptionType.ROLE
    }))
};

export const Executor: CommandRunner<{
    role1: Snowflake;
    role2?: Snowflake;
    role3?: Snowflake;
    role4?: Snowflake;
    role5?: Snowflake;
}> = async (ctx) => {
    await ctx.defer();
    const roles = Object.values(ctx.opts);

    const embeds: MessageEmbedOptions[] = [];

    for (const roleID of roles) {
        const role = ctx.channel.guild.roles.cache.get(roleID);
        if (!role) continue;

        const embed = new MessageEmbed();
        embed.setTitle(role.name);
        embed.setColor(role.hexColor);
        embed.addField("Hex", role.hexColor);
        embed.addField("Members", `${role.members.size}`);
        embed.addField("Created", `${role.createdAt}`);
        embed.addField("ID", role.id);

        embeds.push(embed.toJSON());
    }

    if (embeds.length === 0) throw new CommandError("A valid role was not provided.");

    await ctx.send({ embeds });
};
