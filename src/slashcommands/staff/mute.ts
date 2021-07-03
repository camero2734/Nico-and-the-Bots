import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { CommandOptionType } from "slash-create";
import { roles } from "../../configuration/config";
import parseDuration from "parse-duration";
import { Item } from "../../database/entities/Item";
import { MessageEmbed } from "discord.js";
import { millisecondsToMinutes } from "date-fns";

export const Options = createOptions({
    description: "Mutes a user",
    options: [
        { name: "user", description: "The user to mute", required: true, type: CommandOptionType.USER },
        {
            name: "time",
            description: 'A duration string, like "4 hours and 30 minutes". A number by itself is interpreted as hours',
            required: true,
            type: CommandOptionType.STRING
        },
        {
            name: "reason",
            description: "Reason for muting",
            required: false,
            type: CommandOptionType.STRING
        }
    ]
} as const);

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    const { user, time, reason } = ctx.opts;
    await ctx.defer();

    const timeStr = isNaN(+time) ? time : `${time}hr`; // Interpret a number by itself as hours

    const duration_ms = parseDuration(timeStr);
    if (!duration_ms) throw new CommandError("Unable to parse duration.");

    const member = await ctx.member.guild.members.fetch(user);
    if (member.roles.cache.has(roles.staff)) throw new CommandError("Staff cannot be muted");

    await member.roles.add(roles.muted);
    await member.roles.remove(roles.banditos);

    // Delete any current timeouts (i.e. new timeouts override old ones)
    const itemRepo = ctx.connection.getMongoRepository(Item);
    await itemRepo.deleteMany({ type: "Timeout", identifier: member.id });

    // Add new timeout
    const timeout = new Item({
        identifier: member.id,
        type: "Timeout",
        title: "Timeout",
        time: Date.now() + duration_ms
    });
    await itemRepo.save(timeout);

    const inMinutes = millisecondsToMinutes(duration_ms);
    const embed = new MessageEmbed().setDescription(
        `${member} has been timed out for ${timeStr} (${inMinutes} minutes)`
    );
    await ctx.send({ embeds: [embed.toJSON()] });
};
