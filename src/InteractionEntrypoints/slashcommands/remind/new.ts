import { addMilliseconds } from "date-fns";
import { MessageEmbed } from "discord.js";
import parseDuration from "parse-duration";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { ERRORS, REMINDER_LIMIT } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Sets up a reminder from Nico",
    options: [
        {
            name: "text",
            description: "What you want to be reminded about",
            required: true,
            type: "STRING"
        },
        {
            name: "time",
            description: 'A duration string, like "4 hours and 30 minutes". A number by itself is interpreted as hours',
            required: true,
            type: "STRING"
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const { text, time } = ctx.opts;

    const timeStr = isNaN(+time) ? time : `${time}hr`; // Interpret a number by itself as hours
    const durationMs = parseDuration(timeStr);

    if (!durationMs) throw new CommandError("Unable to parse duration.");

    const remindersCount = await prisma.reminder.count({
        where: { userId: ctx.user.id }
    });

    if (remindersCount >= REMINDER_LIMIT) {
        throw new CommandError(ERRORS.TOO_MANY_REMINDERS); // prettier-ignore
    }

    const sendAt = addMilliseconds(new Date(), durationMs);

    const confirmEmbed = new MessageEmbed()
        .setTitle("Created reminder")
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .addField("Reminder", text)
        .addField("Send time", F.discordTimestamp(sendAt, "longDateTime"));

    await prisma.reminder.create({
        data: { userId: ctx.user.id, text, sendAt }
    });

    await ctx.editReply({ embeds: [confirmEmbed] });
});

export default command;
