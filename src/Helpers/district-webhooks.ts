import { createCanvas, loadImage } from "@napi-rs/canvas";
import { TextChannel, Webhook, WebhookClient } from "discord.js";
import { channelIDs, roles, userIDs } from "../Configuration/config";
import { uploadImageToCloudflareStorage } from "./apis/cloudflare";
import F from "./funcs";

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

export interface WebhookData {
    webhook: Webhook;
    client: WebhookClient;
}
export async function getDistrictWebhookClient(bishop: keyof typeof channelIDs["districts"], channel: TextChannel, forceUpdate = false): Promise<WebhookData> {
    const bishopName = F.capitalize(bishop);

    if (forceUpdate) {
        const webhooks = await channel.fetchWebhooks();
        const existingWebhooks = webhooks.filter(w => w.name === bishopName);
        for (const webhook of existingWebhooks.values()) {
            await webhook.delete();
        }
    } else {
        const webhooks = await channel.fetchWebhooks();
        const existingWebhook = webhooks.find(w => w.name === bishopName);
        if (existingWebhook) {
            return {
                client: new WebhookClient(existingWebhook),
                webhook: existingWebhook,
            };
        }
    }

    const role = await channel.guild.roles.fetch(roles.districts[bishop]);
    if (!role) throw new Error("Role not found");

    const color = F.intColorToRGB(role.color);

    let imageUrl: string;
    let buffer: Buffer;

    if (bishop in userIDs.bots) {
        const bName = bishop as keyof typeof userIDs.bots;
        const botUser = await channel.guild.members.fetch(userIDs.bots[bName]);
        if (!botUser) throw new Error("Bot not found");

        const botImg = botUser.user.avatarURL({ extension: "png", size: 512 });
        if (!botImg) throw new Error("Bot avatar not found");

        imageUrl = botImg;
        buffer = (await loadImage(imageUrl)).src;
    } else {
        [imageUrl, buffer] = await createBishopImage(bishop, color);
    }

    if (!imageUrl || !buffer) throw new Error("Failed to create bishop image");

    const webhook = await channel.createWebhook({
        name: bishopName,
        avatar: imageUrl,
    });

    return {
        client: new WebhookClient(webhook),
        webhook,
    }
}
