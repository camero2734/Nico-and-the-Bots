import { Mutex } from "async-mutex";
import { createCanvas, loadImage } from "canvas";
import { channelIDs } from "configuration/config";
import { Counter } from "database/entities/Counter";
import { GuildMember, MessageAttachment, MessageEmbed, TextChannel } from "discord.js";
import { Connection, LessThan } from "typeorm";
import F from "./funcs";

// Thanks https://stackoverflow.com/questions/22998551/how-to-paragraph-text-drawn-onto-canvas
function fillParagraph(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
    const words = text.split(" ");
    let line = "";
    const lineHeight = 50;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth) {
            ctx.fillText(line, x, y);
            line = words[n] + " ";
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
    return y;
}

const mutex = new Mutex();
export async function sendViolationNotice(
    member: GuildMember,
    channel: TextChannel,
    connection: Connection,
    options: { identifiedAs: string; mainBody: string; reason: string; issuingBishop?: string }
): Promise<void> {
    const { identifiedAs, reason, issuingBishop, mainBody } = options;

    const chan = channel.guild.channels.cache.get(channelIDs.demacouncil) as TextChannel;
    if (!chan) return;

    await F.wait(1000);

    const counters = connection.getRepository(Counter);

    // Use a mutex to ensure each contraband message is assigned a unique number
    mutex.runExclusive(async () => {
        let counter = await counters.findOne({ identifier: "ContrabandCounter", title: "ContrabandCounter" });
        if (!counter) counter = new Counter({ identifier: "ContrabandCounter", title: "ContrabandCounter" });

        const infractionNo = ++counter.count;
        const bishop = issuingBishop || F.randomValueInArray(["Nico", "Reisdro", "Sacarver", "Nills", "Keons", "Lisden", "Andre", "Vetomo", "Listo"]); // prettier-ignore

        const width = 1800;
        const height = 1800;
        // const fontSize = 50;

        const canvas = createCanvas(width, height);
        const cctx = canvas.getContext("2d");

        const img = await loadImage("./src/assets/images/dema_notice.png");
        cctx.drawImage(img, 0, 0, width, height);

        // Draw IDENTIFIED AS ___________ BY DEMA COUNCIL
        cctx.fillStyle = "white";
        cctx.font = "900 80px Lucida Console";
        cctx.textAlign = "center";

        const compressBy = 0.95;
        const originalWidth = cctx.measureText(identifiedAs).width;
        cctx.fillText(identifiedAs, 900, 282, originalWidth * compressBy);

        // Draw main text body
        cctx.font = "45px Arial Narrow";
        cctx.textAlign = "left";
        const mx = 163;
        fillParagraph(cctx, `NOTICE: ${mainBody}\n\nWe have people on the way. We want you home safe.`, mx, 540, width - 2 * mx); // prettier-ignore

        // Infraction No.
        cctx.font = "50px Arial Narrow";
        cctx.textAlign = "center";
        cctx.translate(900, 990);
        cctx.fillText(`Infraction No. ${formatInfractionNumber(infractionNo)}`, 0, 0);

        // Draw Reason
        cctx.translate(0, 75);
        cctx.fillText(reason, 0, 0);

        // Issued by
        cctx.translate(0, 75);
        cctx.fillText(`Issued by ${bishop}`, 0, 0);

        await connection.manager.save(counter);

        // Allow user to see channel
        await chan.createOverwrite(member.id, { VIEW_CHANNEL: true });

        const transmissionEmbed = new MessageEmbed().setDescription("RECEIVING TRANSMISSION FROM DEMA COUNCIL...");
        const m = await chan.send({ embeds: [transmissionEmbed] });
        for (let i = 0; i < 5; i++) {
            const description = transmissionEmbed.description as string;
            transmissionEmbed.description = description.trim() + F.randomizeLetters(".      " as string, 0.1);
            await F.wait(1000);
            await m.edit({ embeds: [transmissionEmbed] });
        }

        await F.wait(1000);

        await m.edit({
            content: `<@${member.id}>`,
            embeds: [transmissionEmbed.setDescription("MESSAGE RECEIVED FROM DEMA COUNCIL:")]
        });
        await chan.send({files: [new MessageAttachment(canvas.toBuffer(), `infraction_${infractionNo}.png`)]}); // prettier-ignore
    });
}

function formatInfractionNumber(infractionNo: number) {
    // Formats to 000
    const padded = `${infractionNo}`.padStart(5, "0");
    return `D${padded.slice(0, 2)}C${padded.slice(2, 5)}`;
}
