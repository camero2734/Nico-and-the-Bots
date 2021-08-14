import { CommandError } from "../../../Configuration/definitions";
import { addMilliseconds, millisecondsToMinutes } from "date-fns";
import { MessageEmbed } from "discord.js";
import parseDuration from "parse-duration";
import { roles } from "../../../Configuration/config";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Mutes a user",
    options: [
        { name: "user", description: "The user to mute", required: true, type: "USER" },
        {
            name: "time",
            description: 'A duration string, like "4 hours and 30 minutes". A number by itself is interpreted as hours',
            required: true,
            type: "STRING"
        },
        {
            name: "reason",
            description: "Reason for muting",
            required: false,
            type: "STRING"
        }
    ]
});

command.setHandler(async (ctx) => {
    const { user, time, reason } = ctx.opts;
    await ctx.deferReply();

    const timeStr = isNaN(+time) ? time : `${time}hr`; // Interpret a number by itself as hours

    const durationMs = parseDuration(timeStr);
    if (!durationMs) throw new CommandError("Unable to parse duration.");

    const endsAt = addMilliseconds(new Date(), durationMs);

    const member = await ctx.member.guild.members.fetch(user);
    if (member.roles.cache.has(roles.staff)) throw new CommandError("Staff cannot be muted");

    await member.roles.add(roles.muted);
    await member.roles.remove(roles.banditos);

    // Mark any current timeouts as finished (i.e. new timeout overrides any old ones)
    await prisma.mute.updateMany({
        where: { mutedUserId: member.id },
        data: { finished: true }
    });

    // Add new timeout
    await prisma.mute.create({
        data: {
            mutedUserId: member.id,
            endsAt,
            issuedByUserId: ctx.member.id,
            channelId: ctx.channel.id,
            reason
        }
    });

    const inMinutes = millisecondsToMinutes(durationMs);
    const timestamp = F.discordTimestamp(endsAt, "shortDateTime");
    const embed = new MessageEmbed()
        .setDescription(`${member} has been timed out for ${timeStr} (${inMinutes} minutes)`)
        .addField("Ends at", timestamp);
    await ctx.send({ embeds: [embed] });
});

export default command;
