import { CommandComponentListener, CommandRunner, createOptions } from "configuration/definitions";
import { GuildMember, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from "discord.js";
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
const deleteReminder = new CommandComponentListener("remindlistdelete", <const>["reminderid"]);
const listReminders = new CommandComponentListener("remindlistshow", []);
export const ComponentListeners: CommandComponentListener[] = [selectReminder, deleteReminder, listReminders];

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer(true);

    const [embed, actionRow] = await generateReminderList(ctx.member, ctx.connection);

    await ctx.send({ embeds: [embed.toJSON()], components: [actionRow.toJSON() as ComponentActionRow] });
};

// Main list
async function generateReminderList(
    member: GuildMember,
    connection: Connection
): Promise<[MessageEmbed, MessageActionRow]> {
    const reminders = (await connection.getRepository(Reminder).find({ userid: member.id })).sort((a, b) => {
        return a.sendAt.getTime() - b.sendAt.getTime();
    });

    const selectMenu = new MessageSelectMenu()
        .setCustomID(selectReminder.generateCustomID({}))
        .setPlaceholder("Select a reminder for more information");

    const emojis = await member.guild.emojis.fetch();

    for (const r of reminders) {
        const emoji = emojis.random();
        emojis.delete(emoji.id);

        const label = r.text.substring(0, 25);
        const description = formatReminderDate(r.sendAt).substring(0, 50);
        selectMenu.addOptions([{ label, description, emoji, value: r._id.toHexString() }]);
    }

    const actionRow = new MessageActionRow().addComponents(selectMenu);
    const embed = new MessageEmbed()
        .setTitle("Your reminders")
        .setDescription(
            "You may view your reminders in the list below. Selecting one will open a new menu with more information, as well as the ability to delete the reminder."
        );

    return [embed, actionRow];
}
listReminders.handler = async (interaction, connection) => {
    const [embed, actionRow] = await generateReminderList(interaction.member as GuildMember, connection);
    interaction.deferred = true;
    await interaction.editReply({ embeds: [embed], components: [actionRow] });
};

// Info page for a specific reminder
selectReminder.handler = async (interaction, connection) => {
    console.log("here", /SELECT/);
    if (!interaction.isSelectMenu()) return;
    interaction.deferred = true;

    const member = interaction.member as GuildMember;

    const selected = interaction.values?.[0];
    if (!selected) return;

    const reminder = await connection.getRepository(Reminder).findOne(selected);
    if (!reminder || reminder.userid !== member.id) return;

    const sendTS = F.discordTimestamp(reminder.sendAt, "longDateTime");
    const sendTSRelative = F.discordTimestamp(reminder.sendAt, "relative");
    const madeTS = F.discordTimestamp(reminder.createdAt, "longDateTime");

    const reminderBody = reminder.text.substring(250);
    const reminderTitle = reminderBody === "" ? reminder.text : `${reminder.text.substring(0, 250)}...`;

    const embed = new MessageEmbed()
        .setTitle(reminderTitle)
        .addField("Sending", `${sendTS} (${sendTSRelative})`)
        .addField("Created", madeTS);

    if (reminderBody !== "") embed.setDescription(`...${reminderBody}`);

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Back to List", style: "PRIMARY", customID: listReminders.generateCustomID({}) }),
        new MessageButton({
            label: "Delete Reminder",
            style: "DANGER",
            customID: deleteReminder.generateCustomID({ reminderid: selected })
        })
    ]);

    await interaction.editReply({ components: [actionRow], embeds: [embed] });
};

// Delete button handler
deleteReminder.handler = async (interaction, connection, args) => {
    console.log("delete", /SELECT/);
    if (!interaction.isButton()) return;
    interaction.deferred = true;

    const member = interaction.member as GuildMember;

    const selected = args.reminderid;
    if (!selected) return;

    const reminder = await connection.getRepository(Reminder).findOne(selected);
    if (!reminder || reminder.userid !== member.id) return;

    // Delete reminder
    await connection.manager.remove(reminder);

    const embed = new MessageEmbed()
        .setTitle("Deleted reminder")
        .setDescription("Your reminder has been deleted.")
        .addField("Text", reminder.text);

    await interaction.editReply({ embeds: [embed], components: [] });
};
