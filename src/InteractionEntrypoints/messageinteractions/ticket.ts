/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { nanoid } from "nanoid";
import { channelIDs, roles } from "../../Configuration/config";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";

const ticketInteraction = new ManualEntrypoint();

const MODAL_TITLE_ID = nanoid();
const MODAL_DESCRIPTION_ID = nanoid();

ticketInteraction.onBotReady(async (guild, client) => {
    const channel = await guild.channels.fetch(channelIDs.ticketSupport);
    if (!channel?.isTextBased()) return;

    const content = `
# Staff Support

This channel is for submitting tickets to the server staff. If you have a **serious**  issue that you would like to raise with the staff, please click the button below to submit a ticket.

**Please note that this is not a channel for suggestions or general questions.**
`;

    const messages = await channel.messages.fetch({ limit: 100 });
    const ticketMessage = messages.find((m) => m.author.id === client.user?.id);

    const button = new ButtonBuilder()
        .setLabel("Open a ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
        .setCustomId(genBtnId({}));

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    if (ticketMessage) {
        await ticketMessage.edit({ content, embeds: [], components: [actionRow] });
    } else {
        await channel.send({ content, embeds: [], components: [actionRow] });
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
            .setPlaceholder("A detailed description of your issue")
            .setCustomId(MODAL_DESCRIPTION_ID)
    );

    await ctx.showModal(modal.setComponents(titleInput, descriptionInput));
});

const genModalId = ticketInteraction.addInteractionListener("ticketSubmitModal", [], async (ctx) => {
    if (!ctx.isModalSubmit()) return;
    await ctx.deferReply({ ephemeral: true });

    const title = ctx.fields.getTextInputValue(MODAL_TITLE_ID);
    const description = ctx.fields.getTextInputValue(MODAL_DESCRIPTION_ID);

    const thread = await ctx.channel.threads.create({
        name: title,
        autoArchiveDuration: 60,
        reason: `Ticket opened by ${ctx.user.tag}`,
        type: ChannelType.PrivateThread
    });

    await thread.members.add(ctx.user.id);

    await thread.send({
        content: `<@&${roles.staffSupport}>`,
        embeds: [
            new EmbedBuilder()
                .setAuthor({
                    name: ctx.user.tag,
                    iconURL: ctx.user.displayAvatarURL(),
                })
                .setTitle(title)
                .setDescription(description)
                .setColor("Blue")
        ]
    });

    await ctx.editReply(`Ticket submitted! A staff member will be with you shortly in <#${thread.id}>`);
});


export default ticketInteraction;
