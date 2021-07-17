import { CommandComponentListener, CommandRunner, createOptions } from "configuration/definitions";
import { format } from "date-fns";
import { EmojiIdentifierResolvable, GuildMember, MessageActionRow, MessageEmbed, MessageSelectMenu } from "discord.js";
import { ComponentActionRow } from "slash-create";
import { Connection } from "typeorm";
import { Reminder } from "../../database/entities/Reminder";
import F from "../../helpers/funcs";
import { formatReminderDate } from "./_consts";

export const Options = createOptions(<const>{
    description: "Presents a list of your reminders",
    options: []
});

const selectReminder = new CommandComponentListener("remindlistselect", []);
const deleteReminder = new CommandComponentListener("remindlistdelete", []);
const listReminders = new CommandComponentListener("remindlistshow", []);

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer(true);

    const actionRow = (await generateReminderList(ctx.member, ctx.connection)).toJSON() as ComponentActionRow;

    await ctx.send({ content: "See below", components: [actionRow] });
};

// Main list
async function generateReminderList(member: GuildMember, connection: Connection): Promise<MessageActionRow> {
    const reminders = (await connection.getRepository(Reminder).find({ userid: member.id })).sort((a, b) => {
        return a.sendAt.getTime() - b.sendAt.getTime();
    });

    const selectMenu = new MessageSelectMenu()
        .setCustomID("reminderlist")
        .setPlaceholder("Select a reminder for more information");

    const emojis = await member.guild.emojis.fetch();

    for (const r of reminders) {
        const emoji = emojis.random();
        emojis.delete(emoji.id);

        const label = r.text.substring(0, 25);
        const description = formatReminderDate(r.sendAt).substring(0, 50);
        selectMenu.addOptions([{ label, description, emoji, value: r._id.toHexString() }]);
    }

    return new MessageActionRow().addComponents(selectMenu);
}
listReminders.handler = async (interaction, connection) => {
    const actionRow = await generateReminderList(interaction.member as GuildMember, connection);
    interaction.deferred = true;
    await interaction.editReply({ components: [actionRow] });
};

// Info page for a specific reminder
selectReminder.handler = async (interaction, connection) => {
    if (!interaction.isSelectMenu()) return;
    const member = interaction.member as GuildMember;

    const selected = interaction.values?.[0];
    if (!selected) return;

    const reminder = await connection.getRepository(Reminder).findOne(selected);
    if (!reminder || reminder.userid !== member.id) return;

    const embed = new MessageEmbed()
        .setTitle(`Sending at ${formatReminderDate(reminder.sendAt)}`)
        .setDescription(reminder.text)
        .setFooter("Local time")
        .setTimestamp(reminder.sendAt);
};
