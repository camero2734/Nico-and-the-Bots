/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";

const ticketInteraction = new ManualEntrypoint();

const TITLE = "Submit a ticket";

ticketInteraction.onBotReady(async (guild) => {
    const channel = await guild.channels.fetch(channelIDs.ticketSupport);
    if (!channel?.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 100 });
    // TODO
    const ticketMessage = messages.find((m) => m.embeds.length > 0 && m.embeds[0].title === TITLE);

    if (!ticketMessage) {
        const embed = new EmbedBuilder()
            .setTitle(TITLE)
            .setDescription("Would you like to raise an issue with the server staff? Click the button below to submit a ticket")
            .setColor("Blue");

        const button = new ButtonBuilder()
            .setLabel("Open a ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎫")
            .setCustomId(genBtnId({}));

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await channel.send({ embeds: [embed], components: [actionRow] });
    }
});

const genBtnId = ticketInteraction.addInteractionListener("ticket", [], async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    await ctx.editReply("Ticket modal go here");
});


export default ticketInteraction;
