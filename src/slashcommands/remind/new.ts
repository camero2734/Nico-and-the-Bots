import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { addMilliseconds, format } from "date-fns";
import { MessageEmbed } from "discord.js";
import parseDuration from "parse-duration";
import { CommandOptionType } from "slash-create";
import { Economy } from "../../database/entities/Economy";
import { Reminder } from "../../database/entities/Reminder";
import F from "../../helpers/funcs";
import { ERRORS, REMINDER_LIMIT, REMINDER_TIMES } from "./_consts";

export const Options = createOptions(<const>{
    description: "Sets up a reminder from Nico",
    options: [
        {
            name: "text",
            description: "What you want to be reminded about",
            required: true,
            type: CommandOptionType.STRING
        },
        {
            name: "intime",
            description: "When the reminder should be sent",
            required: true,
            type: CommandOptionType.INTEGER,
            choices: Object.entries(REMINDER_TIMES).map(([name, value]) => ({ name, value }))
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer(true);

    const { text, intime } = ctx.opts;

    const reminders = await ctx.connection.getMongoRepository(Reminder).count({ userid: ctx.member.id });
    if (reminders >= REMINDER_LIMIT) {
        throw new CommandError(ERRORS.TOO_MANY_REMINDERS); // prettier-ignore
    }

    const sendAt = addMilliseconds(new Date(), intime);

    const reminder = new Reminder({ text, userid: ctx.member.id, sendAt });

    const confirmEmbed = new MessageEmbed()
        .setTitle("Created reminder")
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .addField("Reminder", reminder.text)
        .addField("Send time", F.discordTimestamp(sendAt, "longDateTime"));

    await ctx.connection.manager.save(reminder);

    await ctx.send({ embeds: [confirmEmbed.toJSON()] });
};
