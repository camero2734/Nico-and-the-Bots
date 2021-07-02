import { Mutex } from "async-mutex";
import { createCanvas, loadImage } from "canvas";
import { channelIDs } from "configuration/config";
import { Counter } from "database/entities/Counter";
import { GuildMember, MessageAttachment, MessageEmbed, TextChannel } from "discord.js";
import { Connection } from "typeorm";
import F from "./funcs";

const mutex = new Mutex();
export async function sendViolationNotice(
    member: GuildMember,
    channel: TextChannel,
    connection: Connection,
    rolePurchased: string
): Promise<void> {
    const chan = channel.guild.channels.cache.get(channelIDs.demacouncil) as TextChannel;
    if (!chan) return;

    await F.wait(1000);

    const counters = connection.getRepository(Counter);

    // Use a mutex to ensure each contraband message is assigned a unique number
    mutex.runExclusive(async () => {
        let counter = await counters.findOne({ identifier: "ContrabandCounter", title: "ContrabandCounter" });
        if (!counter) counter = new Counter({ identifier: "ContrabandCounter", title: "ContrabandCounter" });

        const infractionNo = ++counter.count;
        const bishop = F.randomValueInArray(["Nico", "Reisdro", "Sacarver", "Nills", "Keons", "Lisden", "Andre", "Vetomo", "Listo"]); // prettier-ignore

        const width = 1800;
        const height = 1800;
        const fontSize = 50;

        const canvas = createCanvas(width, height);
        const cctx = canvas.getContext("2d");
        cctx.font = `${fontSize}px Arial Narrow`;

        const img = await loadImage("./src/assets/images/contraband_warning.png");

        cctx.drawImage(img, 0, 0, width, height);

        cctx.translate(0.5 * width, 0.55 * height);
        cctx.fillStyle = "white";
        cctx.textAlign = "center";
        cctx.fillText(`Infraction No. ${formatInfractionNumber(infractionNo)}`, 0, 0);

        cctx.translate(0, 1.5 * fontSize);
        cctx.fillText(`Possession of ${rolePurchased.toUpperCase()}`, 0, 0);

        cctx.translate(0, 1.5 * fontSize);
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
