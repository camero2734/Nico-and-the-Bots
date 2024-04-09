import { addMilliseconds, millisecondsToMinutes } from "date-fns";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import parseDuration from "parse-duration";
import { roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { MessageTools } from "../../../Helpers";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Mutes a user",
    options: [
        { name: "user", description: "The user to mute", required: true, type: ApplicationCommandOptionType.User },
        {
            name: "time",
            description: 'A duration string, like "4 hours and 30 minutes". A number by itself is interpreted as hours',
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "reason",
            description: "Reason for muting",
            required: false,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    const { user, time, reason } = ctx.opts;
    await ctx.deferReply();

    const timeStr = isNaN(+time) ? time : `${time}hr`; // Interpret a number by itself as hours

    const durationMs = parseDuration(timeStr);
    if (!durationMs) throw new CommandError("Unable to parse duration.");
    if (durationMs > 2419200000) throw new CommandError("You cannot mute longer than 28 days.")

    const endsAt = addMilliseconds(new Date(), durationMs);

    const member = await ctx.member.guild.members.fetch(user);
    if (member.roles.cache.has(roles.staff)) throw new CommandError("Staff cannot be muted");

    await member.timeout(durationMs, reason);

    const inMinutes = millisecondsToMinutes(durationMs);
    const timestamp = F.discordTimestamp(endsAt, "shortDateTime");
    const embed = new EmbedBuilder()
        .setDescription(`${member} has been timed out for ${timeStr} (${inMinutes} minutes)`)
        .addFields([{ name: "Ends at", value: timestamp }]);
    await ctx.send({ embeds: [embed] });

    // Message timed out member
    const dmEmbed = new EmbedBuilder()
        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
        .setDescription(
            `You have been muted until ${timestamp}. You can always message the server moderators if you feel there has been a mistake.`
        );

    await MessageTools.safeDM(member, { embeds: [dmEmbed] });
});

export default command;
