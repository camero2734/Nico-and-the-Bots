import { createCanvas, loadImage } from "@napi-rs/canvas";
import { EmbedBuilder, WebhookClient } from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import secrets from "../../../Configuration/secrets";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { uploadImageToCloudflareStorage } from "../../../Helpers/apis/image";

const command = new SlashCommand({
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    const webhookClient = new WebhookClient({ url: secrets.webhookUrl });

    const role = await ctx.guild.roles.fetch(roles.districts.listo);
    if (!role) throw new CommandError("Role not found");

    const color = F.intColorToRGB(role.color);

    const [imageUrl, buffer] = await createBishopImage("Listo", color);

    const embed = new EmbedBuilder()
        .setAuthor({ name: "Listo", iconURL: "attachment://bishop.png" })
        .setDescription("test!");

    const m = await webhookClient.send({
        username: "Listo",
        avatarURL: imageUrl,
        embeds: [embed],
        files: [{ name: "bishop.png", attachment: buffer }]
    });

    await webhookClient.editMessage(m.id, { content: "Edited" });
});

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

        const brightness = Math.min(0.2 + ((r + g + b) / 3) / 255, 1);

        data[i] = F.lerp(brightness, colorFrom[0], colorTo[0]);
        data[i + 1] = F.lerp(brightness, colorFrom[1], colorTo[1]);
        data[i + 2] = F.lerp(brightness, colorFrom[2], colorTo[2]);
    }

    ctx.putImageData(imgData, 0, 0);

    const buffer = canvas.toBuffer("image/png");

    return [await uploadImageToCloudflareStorage(`bishop_${name}.png`, buffer), buffer];
}

export default command;
