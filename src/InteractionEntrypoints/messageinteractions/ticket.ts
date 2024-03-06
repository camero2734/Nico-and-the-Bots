/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { nanoid } from "nanoid";

const ticketInteraction = new ManualEntrypoint();

const MODAL_TITLE_ID = nanoid();
const MODAL_DESCRIPTION_ID = nanoid();

ticketInteraction.onBotReady(async (guild, client) => {
    const channel = await guild.channels.fetch(channelIDs.ticketSupport);
    if (!channel?.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 100 });
    const ticketMessage = messages.find((m) => m.author.id === client.user?.id);

    const embed = new EmbedBuilder()
        .setTitle("Submit a ticket")
        .setDescription("Would you like to raise an issue with the server staff? Click the button below to submit a ticket")
        .setColor("Blue");

    const button = new ButtonBuilder()
        .setLabel("Open a ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
        .setCustomId(genBtnId({}));

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    if (ticketMessage) {
        await ticketMessage.edit({ embeds: [embed], components: [actionRow] });
    } else {
        await channel.send({ embeds: [embed], components: [actionRow] });
    }
});

const genBtnId = ticketInteraction.addInteractionListener("ticketOpenModal", [], async (ctx) => {
    if (!ctx.isButton()) return;

    const modal = new ModalBuilder()
        .setTitle("Ticket Submission")
        .setCustomId(genModalId({}));

    const titleInput = new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
            .setStyle(TextInputStyle.Short)
            .setLabel("Issue Title")
            .setPlaceholder("A short title for your issue")
            .setCustomId(MODAL_TITLE_ID)
    );

    const descriptionInput = new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
            .setStyle(TextInputStyle.Paragraph)
            .setLabel("Issue Description")
            .setPlaceholder("A detailed description of your issue. You can send follow-up messages after submitting the ticket with images/etc.")
            .setCustomId(MODAL_DESCRIPTION_ID)
    );

    await ctx.showModal(modal.setComponents(titleInput, descriptionInput));
});

const genModalId = ticketInteraction.addInteractionListener("ticketSubmitModal", [], async (ctx) => {
    if (!ctx.isModalSubmit()) return;
    await ctx.deferReply({ ephemeral: true });

    const title = ctx.fields.getTextInputValue(MODAL_TITLE_ID);
    const description = ctx.fields.getTextInputValue(MODAL_DESCRIPTION_ID);

    await ctx.editReply(`You submitted a ticket with the title "${title}" and the description "${description.slice(0, 100)}"`);
});


export default ticketInteraction;
