import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { addMilliseconds } from "date-fns";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import { Reminder } from "../../database/entities/Reminder";
import F from "../../helpers/funcs";
import { prisma } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";
import { ERRORS, REMINDER_LIMIT, REMINDER_TIMES } from "./_consts";

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
            name: "intime",
            description: "When the reminder should be sent",
            required: true,
            type: "INTEGER",
            choices: Object.entries(REMINDER_TIMES).map(([name, value]) => <const>{ name, value })
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.defer({ ephemeral: true });

    const { text, intime } = ctx.opts;

    const remindersCount = await prisma.reminder.count({
        where: { userId: ctx.user.id }
    });

    if (remindersCount >= REMINDER_LIMIT) {
        throw new CommandError(ERRORS.TOO_MANY_REMINDERS); // prettier-ignore
    }

    const sendAt = addMilliseconds(new Date(), intime);

    const reminder = new Reminder({ text, userid: ctx.member.id, sendAt });

    const confirmEmbed = new MessageEmbed()
        .setTitle("Created reminder")
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .addField("Reminder", reminder.text)
        .addField("Send time", F.discordTimestamp(sendAt, "longDateTime"));

    await prisma.reminder.create({
        data: { userId: ctx.user.id, text, sendAt }
    });

    await ctx.send({ embeds: [confirmEmbed] });
});

export default command;