import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import { roles } from "../../configuration/config";

export const Options: CommandOptions = {
    description: "Enables or disables the announcements role",
    options: []
};

export const Executor: CommandRunner<Record<string, Snowflake>> = async (ctx) => {
    const hasAnnouncements = ctx.member.roles.cache.has(roles.announcements);
    const action = hasAnnouncements ? "Removed" : "Added";

    const embed = new MessageEmbed().setDescription(`${action} the <@&${roles.announcements}> role`);

    if (hasAnnouncements) ctx.member.roles.remove(roles.announcements);
    else ctx.member.roles.add(roles.announcements);

    await ctx.send({ embeds: [embed.toJSON()] });
};
