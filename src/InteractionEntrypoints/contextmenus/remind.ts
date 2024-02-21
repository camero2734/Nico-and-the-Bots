import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { MessageContextMenu } from "../../Structures/EntrypointContextMenu";
import parseDuration from "parse-duration";
import { CommandError } from "../../Configuration/definitions";
import { prisma } from "../../Helpers/prisma-init";
import { ERRORS, REMINDER_LIMIT } from "../slashcommands/remind/_consts";
import { addMilliseconds } from "date-fns";
import F from "../../Helpers/funcs";

const ctxMenu = new MessageContextMenu("⏰ Remind Me");

const REMIND_WHEN_CUSTOM_ID = "REMINDER_MODAL_WHEN";
const REMIND_EXTRA_TEXT_CUSTOM_ID = "REMINDER_MODAL_EXTRA_TEXT";

ctxMenu.setHandler(async (ctx, msg) => {
    if (!msg.member) throw new Error("Could not find member");

    await ctx.deferReply({ ephemeral: true });

    const modal = new ModalBuilder()
        .setCustomId(genHandleId({}));

    const remindedAction = new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
            .setCustomId(REMIND_WHEN_CUSTOM_ID)
            .setLabel("When would you like to be reminded?")
            .setPlaceholder("e.g. 4 hours and 30 minutes, or just a number for hours")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
    );

    const extraTextAction = new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
            .setCustomId(REMIND_EXTRA_TEXT_CUSTOM_ID)
            .setLabel("Any additional information?")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
    );

    // Add inputs to the modal
    modal.setComponents(remindedAction, extraTextAction);

    await ctx.showModal(modal);
});

const genHandleId = ctxMenu.addInteractionListener(
    "submitReminderModal",
    <const>[],
    async (ctx) => {
        if (!ctx.isModalSubmit()) return;
        await ctx.deferReply({ ephemeral: true });

        const time = ctx.fields.getTextInputValue(REMIND_WHEN_CUSTOM_ID);
        const text = ctx.fields.getTextInputValue(REMIND_EXTRA_TEXT_CUSTOM_ID);

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

        const confirmEmbed = new EmbedBuilder()
            .setTitle("Created reminder")
            .setAuthor({ name: ctx.member.displayName, iconURL: ctx.member.user.displayAvatarURL() })
            .addFields([{ name: "Reminder", value: text }])
            .addFields([{ name: "Send time", value: F.discordTimestamp(sendAt, "longDateTime") }]);

        await prisma.reminder.create({
            data: { userId: ctx.user.id, text, sendAt }
        });

        await ctx.editReply({ embeds: [confirmEmbed] });
    }
);

export default ctxMenu;
