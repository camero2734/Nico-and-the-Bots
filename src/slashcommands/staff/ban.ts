import { roles } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner, CommandTypeMap } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Submits a warning for a user",
    options: [
        { name: "user", description: "The user to warn", required: true, type: CommandOptionType.USER },
        {
            name: "purge",
            description: "Whether to delete all messages or not",
            required: false,
            type: CommandOptionType.BOOLEAN
        },
        { name: "reason", description: "Reason for banning", required: false, type: CommandOptionType.STRING }
    ]
};

export const Executor: CommandRunner<{
    user: Snowflake;
    purge: boolean;
}> = async (ctx) => {
    const { user, purge } = ctx.opts;
    const member = await ctx.member.guild.members.fetch(user);
    if (!member) throw new CommandError("Could not find this member. They may have already been banned or left.");

    if (member.roles.cache.has(roles.staff) || member.user.bot) {
        throw new CommandError("You cannot ban a staff member or bot.");
    }

    await member.ban({ days: purge ? 7 : 0 });

    await ctx.send({ embeds: [new MessageEmbed({ description: `${member.toString()} was banned.` }).toJSON()] });
};
