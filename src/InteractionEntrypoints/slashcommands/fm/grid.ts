import { createCanvas, Image, loadImage } from "canvas";
import { CommandError } from "../../../Configuration/definitions";
import { Embed, ApplicationCommandOptionType } from "discord.js/packages/discord.js";
import fetch from "node-fetch";
import { Album, createFMMethod, getFMUsername, RankedAlbum } from "./_consts";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Generates a weekly overview for your last.fm stats",
    options: [
        {
            name: "size",
            description: "The number of rows and columns in the output",
            type: ApplicationCommandOptionType.Integer
        },
        {
            name: "timeperiod",
            description: "Period of time to fetch for (defaults to 1 week)",
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "1 week", value: "7day" },
                { name: "1 month", value: "1month" },
                { name: "3 months", value: "3month" },
                { name: "6 months", value: "6month" },
                { name: "12 months", value: "12month" },
                { name: "Overall", value: "overall" }
            ]
        },
        {
            name: "user",
            description: "The user in the server to lookup",
            required: false,
            type: ApplicationCommandOptionType.User
        },
        {
            name: "username",
            description: "The Last.FM username to lookup",
            required: false,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const username = await getFMUsername(ctx.opts.username, ctx.opts.user, ctx.member);

    const start = Date.now();

    const size = ctx.opts.size || 3;
    const date = ctx.opts.timeperiod || "7day";
    const num = size ** 2;

    if (size > 20) throw new CommandError("The grid can be at most 20x20");

    const fmEndpoint = createFMMethod(username);

    const req_url = fmEndpoint({ method: "user.gettopalbums", period: date, limit: `${num}` });

    const res = await fetch(req_url);
    const json = (await res.json()) as Record<string, any>;

    const topTracks = json?.topalbums?.album as RankedAlbum[];
    if (!topTracks) throw new Error("Toptracks null");
    const collected = topTracks.slice(0, num).map((a) => new Album(a));

    //CREATE COLLAGE
    const canvas = createCanvas(size * 200, size * 200);
    const cctx = canvas.getContext("2d");

    const imageSize = size < 15 ? "/300x300/" : "/34s/";

    const images = await Promise.allSettled(collected.map((c) => loadImage(c.image.replace("/300x300/", imageSize))));

    cctx.fillStyle = "white";
    cctx.strokeStyle = "black";

    for (let i = 0; i < collected.length; i++) {
        const album = collected[i];
        if (album.image.length < 2) continue;
        const fetchImage = images[i];
        const image = fetchImage.status === "fulfilled" ? fetchImage.value : new Image();

        const x = 200 * (i % size);
        const y = 200 * Math.floor(i / size);
        cctx.drawImage(image, x, y, 200, 200);

        cctx.strokeText(album.name, x, y + 10);
        cctx.fillText(album.name, x, y + 10);
    }

    const lastFMIcon = "http://icons.iconarchive.com/icons/sicons/flat-shadow-social/512/lastfm-icon.png";
    const embed = new Embed()
        .setAuthor(username, lastFMIcon, `https://www.last.fm/user/${username}`)
        .setImage("attachment://chart.png")
        .setColor("RANDOM")
        .setDescription(`${size}x${size}, ${date}`)
        .setFooter(`${Date.now() - start}ms`);

    await ctx.send({
        embeds: [embed.toJSON()],
        files: [{ name: "chart.png", attachment: canvas.toBuffer() }]
    });
});

export default command;
