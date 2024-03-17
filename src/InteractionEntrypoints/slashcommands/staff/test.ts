import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, TextChannel, Webhook, WebhookClient } from "discord.js";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { uploadImageToCloudflareStorage } from "../../../Helpers/apis/image";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    const currentChannel = ctx.channel;

    if (!Object.keys(channelIDs.districts).includes(currentChannel.name)) {
        throw new CommandError("Invalid channel");
    }

    const bishopName = currentChannel.name as keyof typeof channelIDs.districts;

    const channel = await ctx.guild.channels.fetch(channelIDs.districts[bishopName]);
    if (channel?.type !== ChannelType.GuildText) throw new CommandError("Channel not found");

    const role = await ctx.guild.roles.fetch(roles.districts[bishopName]);
    if (!role) throw new CommandError("Role not found");

    const color = F.intColorToRGB(role.color);

    let imageUrl: string;
    let buffer: Buffer;

    if (bishopName in userIDs.bots) {
        const bName = bishopName as keyof typeof userIDs.bots;
        const botUser = await ctx.guild.members.fetch(userIDs.bots[bName]);
        if (!botUser) throw new CommandError("Bot not found");

        const botImg = botUser.user.avatarURL({ extension: "png", size: 512 });
        if (!botImg) throw new CommandError("Bot avatar not found");

        imageUrl = botImg;
        buffer = (await loadImage(imageUrl)).src;
    } else {
        [imageUrl, buffer] = await createBishopImage(bishopName, color);
    }

    if (!imageUrl || !buffer) throw new CommandError("Failed to create bishop image");

    const webhook = await getOrCreateWebhook(
        channel,
        F.capitalize(bishopName),
        imageUrl,
    );

    const webhookClient = new WebhookClient({ url: webhook.url });

    const embed = new EmbedBuilder()
        .setAuthor({ name: F.capitalize(bishopName), iconURL: "attachment://bishop.png" })
        .setDescription("test!");

    const m = await webhookClient.send({
        embeds: [embed],
        files: [{ name: "bishop.png", attachment: buffer }]
    });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
            .setCustomId(genId({}))
            .setStyle(ButtonStyle.Primary)
            .setLabel("Test")
    );

    await webhookClient.editMessage(m.id, { content: "Edited", components: [actionRow] });
});

const genId = command.addInteractionListener("testBishopMsg", [], async (ctx) => {
    await ctx.deferUpdate();

    await ctx.editReply({ content: "you did it" });
});

async function getOrCreateWebhook(channel: TextChannel, bishopName: string, avatarUrl: string): Promise<Webhook> {
    const webhooks = await channel.fetchWebhooks();

    const existingWebhook = webhooks.find(w => w.name === bishopName);
    if (existingWebhook) return existingWebhook;

    return await channel.createWebhook({
        name: bishopName,
        avatar: avatarUrl,
    });
}

async function createBishopImage(name: string, colorTo: [number, number, number]): Promise<[string, Buffer]> {
    const image = await loadImage("./src/Assets/bishop_generic.png");

    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0, 500, 500);

    const imgData = ctx.getImageData(0, 0, 500, 500);
    const data = imgData.data;

    const colorFrom = [0, 0, 0];

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = Math.min(0.1 + ((r + g + b) / 3) / 255, 1);

        data[i] = F.lerp(brightness, colorFrom[0], colorTo[0]);
        data[i + 1] = F.lerp(brightness, colorFrom[1], colorTo[1]);
        data[i + 2] = F.lerp(brightness, colorFrom[2], colorTo[2]);
    }

    ctx.putImageData(imgData, 0, 0);

    const buffer = canvas.toBuffer("image/png");

    return [await uploadImageToCloudflareStorage(`bishop_${name}.png`, buffer), buffer];
}

export default command;
