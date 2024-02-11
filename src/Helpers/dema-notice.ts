import { BishopType, ViolationType } from "@prisma/client";
import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas";
import { GuildMember, AttachmentBuilder, EmbedBuilder, TextChannel } from "discord.js";
import { channelIDs } from "../Configuration/config";
import F from "./funcs";
import { prisma } from "./prisma-init";

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

type ViolationDataGenerator = (bishop: BishopType, inData: string) => { name: string; found: string; reason: string };
const violationData: Record<ViolationType, ViolationDataGenerator> = {
    PossessionOfContraband: (bishop, roleName) => ({
        name: "POSSESSION OF ILLEGAL CONTRABAND",
        found: "in possession of regulated materials that have been outlawed by the Dema Council",
        reason: `Possession of ${roleName.toUpperCase()}`
    }),
    FailedPerimeterEscape: () => ({
        name: "FAILED PERIMETER ESCAPE",
        found: "",
        reason: ""
    }),
    ConspiracyAndTreason: (bishop) => ({
        name: "CONSPIRACY TO COMMIT TREASON",
        found: "trespassing while conspiring against the Dema Council",
        reason: `Unlawful access in DST. ${bishop.toUpperCase()}`
    })
};

export async function sendViolationNotice(
    member: GuildMember,
    options: { violation: ViolationType; data?: string; issuingBishop?: BishopType }
): Promise<void> {
    const { violation, issuingBishop } = options;

    const chan = member.guild.channels.cache.get(channelIDs.shop) as TextChannel;
    if (!chan) return;

    const thread = await chan.threads.fetch(channelIDs.demacouncilThread);
    if (!thread) return;
    if (!thread.joined) await thread.join();

    const bishop = issuingBishop || F.randomValueInArray(Object.values(BishopType));

    const notice = await prisma.violationNotice.create({
        data: { givenBy: bishop, violation, userId: member.id }
    });
    const infractionNo = notice.infractionNumber;

    const { name, found, reason } = violationData[violation](bishop, options.data || "");

    await F.wait(1000);

    const width = 1800;
    const height = 1800;

    const canvas = createCanvas(width, height);
    const cctx = canvas.getContext("2d");

    const img = await loadImage("./src/Assets/images/dema_notice.png");
    cctx.drawImage(img, 0, 0, width, height);

    // Draw IDENTIFIED AS ___________ BY DEMA COUNCIL
    cctx.fillStyle = "white";
    cctx.font = "900 80px FiraCode";
    cctx.textAlign = "center";

    const compressBy = 0.95;
    const originalWidth = cctx.measureText(name).width;
    cctx.fillText(name, 900, 282, originalWidth * compressBy);

    // Draw main text body
    cctx.font = "45px FiraCode";
    cctx.textAlign = "left";
    const mx = 163;
    const body = `You are in violation with the laws set forth by DMA ORG and The Sacred Municipality of Dema. You were found ${found}. Further actions will be taken to ensure these violations will not occur again`;
    fillParagraph(cctx, `NOTICE: ${body}.\n\nWe have people on the way. We want you home safe.`, mx, 540, width - 2 * mx); // prettier-ignore

    // Infraction No.
    cctx.font = "50px FiraCode";
    cctx.textAlign = "center";
    cctx.translate(900, 990);
    cctx.fillText(`Infraction No. ${formatInfractionNumber(infractionNo)}`, 0, 0);

    // Draw Reason
    cctx.translate(0, 75);
    cctx.fillText(reason, 0, 0);

    // Issued to
    cctx.translate(0, 75);
    cctx.fillText(`Issued to @${member.displayName}`, 0, 0);

    const transmissionEmbed = new EmbedBuilder().setDescription("RECEIVING TRANSMISSION FROM DEMA COUNCIL...");
    const m = await thread.send({
        content: `${member}`,
        embeds: [transmissionEmbed],
    });
    for (let i = 0; i < 5; i++) {
        const description = transmissionEmbed.data.description as string;
        transmissionEmbed.setDescription(description.trim() + F.randomizeLetters(".      " as string, 0.1));
        await F.wait(1000);
        await m.edit({ embeds: [transmissionEmbed] });
    }

    await F.wait(1000);


    const fileName = `infraction_${infractionNo}.png`;
    transmissionEmbed.setDescription("MESSAGE RECEIVED FROM DEMA COUNCIL:")
    transmissionEmbed.setImage(`attachment://${fileName}`);
    transmissionEmbed.setColor("Red");
    await m.edit({ content: `${member}`, embeds: [transmissionEmbed], files: [new AttachmentBuilder(canvas.toBuffer(), { name: fileName })] }); // prettier-ignore
}

function formatInfractionNumber(infractionNo: number) {
    // Formats to 000
    const padded = `${infractionNo}`.padStart(5, "0");
    return `D${padded.slice(0, 2)}C${padded.slice(2, 5)}`;
}
