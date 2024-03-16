import { AttachmentBuilder, EmbedBuilder, WebhookClient } from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import F from "../../../Helpers/funcs";
import { CommandError } from "../../../Configuration/definitions";

const command = new SlashCommand({
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    const webhookClient = new WebhookClient({ url: secrets.webhookUrl });

    const embed = new EmbedBuilder()
        .setAuthor({ name: "Andre", iconURL: "attachment://bishop.png" })
        .setDescription("test!");

    const role = await ctx.guild.roles.fetch(roles.districts.andre);
    if (!role) throw new CommandError("Role not found");

    const color = F.intColorToRGB(role.color);

    const image = await createBishopImage(color);
    const attachment = new AttachmentBuilder(image, { name: "bishop.png" });

    const m = await webhookClient.send({
        username: "Andre",
        embeds: [embed],
        files: [attachment],
    });

    const channel = await ctx.guild.channels.fetch(m.channel_id);
    if (!channel?.isTextBased()) return;

    const msg = await channel.messages.fetch(m.id);
    await msg.edit({
        content: "Edited",
    })
});

async function createBishopImage(colorTo: [number, number, number]) {
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

    return canvas.toBuffer("image/png");
}

export default command;
