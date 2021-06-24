import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Role, Snowflake, TextChannel } from "discord.js";

export const Options: CommandOptions = {
    description: "Selects a concert channel",
    options: [
        /**
         * These are automatically populated from concert-channels.ts concerts
         */
    ]
};

export const Executor: CommandRunner<Record<string, Snowflake>> = async (ctx) => {
    await ctx.defer(true);
    const channels = Object.values(ctx.opts).map((cid) => ctx.channel.guild.channels.cache.get(cid) as TextChannel);

    const allRoles = await ctx.channel.guild.roles.fetch();
    const rolesToGive = channels.map((c) => allRoles.find((r) => r.name === c.name)) as Role[];

    const text = rolesToGive.map((r) => `${r}`).join(", ");

    for (const role of rolesToGive) {
        await ctx.member.roles.add(role);
    }

    const embed = new MessageEmbed()
        .setTitle("Concert role(s) successfully added!")
        .setDescription(`You got the following role(s): ${text}`);

    await ctx.send({ embeds: [embed.toJSON()], allowedMentions: { roles: [], everyone: false } });
};
