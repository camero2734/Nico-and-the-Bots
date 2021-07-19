import { createCanvas, loadImage } from "canvas";
import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { CommandOptionType } from "slash-create";
import { Item } from "../../database/entities/Item";
import { Album, createFMMethod, RankedAlbum } from "./_consts";

export const Options = createOptions(<const>{
    description: "Generates a weekly overview for your last.fm stats",
    options: [
        { name: "size", description: "The number of rows and columns in the output", type: CommandOptionType.INTEGER },
        {
            name: "timeperiod",
            description: "Period of time to fetch for (defaults to 1 week)",
            type: CommandOptionType.STRING,
            choices: [
                { name: "1 week", value: "7day" },
                { name: "1 month", value: "1month" },
                { name: "3 months", value: "3month" },
                { name: "6 months", value: "6month" },
                { name: "12 months", value: "12month" },
                { name: "Overall", value: "overall" }
            ]
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    const size = ctx.opts.size || 3;
    const date = ctx.opts.timeperiod || "7day";
    const num = size ** 2;

    const userItem = await ctx.connection.getRepository(Item).findOne({ identifier: ctx.member.id, type: "FM" });
    if (!userItem) throw new CommandError("You must use `/fm set` first!");

    const username = userItem.title;

    const fmEndpoint = createFMMethod(username);

    const req_url = fmEndpoint({ method: "user.gettopalbums", period: date, limit: `${num}` });

    const res = await fetch(req_url);
    const json = await res.json();

    const topTracks = json.topalbums.album as RankedAlbum[];
    const collected = topTracks.slice(0, num).map((a) => new Album(a));

    //CREATE COLLAGE
    const canvas = createCanvas(size * 200, size * 200);
    const cctx = canvas.getContext("2d");
    for (let i = 0; i < collected.length; i++) {
        const album = collected[i];
        if (album.image.length < 2) continue;
        const image = await loadImage(album.image);

        const x = 200 * (i % size);
        const y = 200 * Math.floor(i / size);
        cctx.drawImage(image, x, y, 200, 200);
        cctx.fillStyle = "white";
        cctx.strokeStyle = "black";
        cctx.strokeText(album.name, x, y + 10);
        cctx.fillText(album.name, x, y + 10);
    }
    const embed = new MessageEmbed()
        .setImage("attachment://chart.png")
        .setColor("RANDOM")
        .setDescription(`${size}x${size}, ${date}`)
        .setFooter(username);

    await ctx.send({ embeds: [embed.toJSON()], file: { name: "chart.png", file: canvas.toBuffer() } });
};
