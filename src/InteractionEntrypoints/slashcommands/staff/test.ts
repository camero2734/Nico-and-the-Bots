import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, WebhookClient } from "discord.js";
import { channelIDs, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { getDistrictWebhookClient } from "../../../Helpers/district-webhooks";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    await ctx.deferReply({ ephemeral: true });

    const currentChannel = ctx.channel;

    if (currentChannel.id === channelIDs.gloriousVista) return gloriousVista(ctx);

    const bishopName = currentChannel.name as keyof typeof channelIDs["districts"];

    if (!Object.keys(channelIDs.districts).includes(bishopName)) {
        throw new CommandError("Invalid channel");
    }

    const { webhook, client: bishopClient } = await getDistrictWebhookClient(bishopName, currentChannel);

    const iconURL = webhook.avatarURL({ extension: "png", size: 512 });
    if (!iconURL) throw new Error("Icon URL not found");

    const embed = new EmbedBuilder()
        .setAuthor({ name: F.capitalize(bishopName), iconURL })
        .setDescription("test!");

    const m = await bishopClient.send({
        embeds: [embed],
    });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
            .setCustomId(genId({}))
            .setStyle(ButtonStyle.Primary)
            .setLabel("Test")
    );

    await bishopClient.editMessage(m.id, { content: "Edited", components: [actionRow] });

    await ctx.editReply("OK");
});

const genId = command.addInteractionListener("testBishopMsg", [], async (ctx) => {
    await ctx.deferUpdate();

    const webhook = await ctx.message.fetchWebhook();
    if (!webhook) throw new Error("Webhook not found");

    const client = new WebhookClient(webhook);

    await client.send("you did it");
});

async function gloriousVista(ctx: (typeof SlashCommand)["GenericContextType"]) {
    const botMember = await ctx.guild.members.fetch(ctx.client.user.id);
    if (!botMember) return;

    const embed = new EmbedBuilder()
        .setTitle("Glorious Vista Daily Standings")
        .setDescription("Thank you to all of our loyal citizens for their hard work yesterday. Here are the standings:")
        .setColor(botMember.displayColor);

    const randomOrder = F.shuffle(F.entries(channelIDs.districts));

    let i = 2;
    for (const [name, _id] of randomOrder) {
        embed.addFields({
            name: `${i - 1}. ${F.capitalize(name)}`,
            value: `${i} points`,
        });
        i++;
    }

    await ctx.editReply({ embeds: [embed] });
}

export default command;
