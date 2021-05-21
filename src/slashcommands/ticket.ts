import { Mutex } from "async-mutex";
import { createCanvas, loadImage, registerFont } from "canvas";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Item } from "database/entities/Item";

const mutex = new Mutex();

export const Options: CommandOptions = {
    description: "Receive a custom ticket for the SAI livestream experience!",
    options: []
};

export const Executor: CommandRunner<{ number: number }> = async (ctx) => {
    const counters = ctx.connection.getRepository(Counter);
    const items = ctx.connection.getRepository(Item);
    // Use a mutex to ensure everyone is assigned a unique number
    mutex.runExclusive(async () => {
        let counter = await counters.findOne({ id: "TicketCounter", title: "TicketCounter" });
        if (!counter) counter = new Counter({ id: "TicketCounter", title: "TicketCounter" });

        let ticketNum = ++counter.count;
        let updateCounter = true;

        const ticketData = { id: ctx.user.id, title: "SAITicket", type: "SAITicket" };
        const userTicket = await items.findOne(ticketData);
        if (userTicket) {
            updateCounter = false;
            ticketNum = +(userTicket.data || 0);
        } else {
            const newUserTicket = new Item({ ...ticketData, data: `${ticketNum}` });
            await ctx.connection.manager.save(newUserTicket);
        }

        const width = 1555;
        const height = 700;

        registerFont("./src/assets/fonts/FiraCode/Regular.ttf", { family: "FiraCode" });

        const canvas = createCanvas(width, height);
        const cctx = canvas.getContext("2d");
        cctx.font = ticketNum > 999 ? "150px FiraCode" : "200px FiraCode";

        const img = await loadImage("./src/assets/images/livestream_ticket.png");

        cctx.drawImage(img, 0, 0, width, height);

        cctx.translate((1265 * width) / 1555, height / 2);
        cctx.rotate(Math.PI / 2);
        cctx.fillStyle = "#F584B8";
        cctx.textAlign = "center";
        cctx.fillText(`${ticketNum}`.padStart(3, "0"), 0, 0);

        if (updateCounter) await ctx.connection.manager.save(counter);

        await ctx.sendFollowUp("\u200b", {
            file: [{ name: `ticket_${ticketNum}.png`, file: canvas.toBuffer() }]
        });
    });
};
