import { createCanvas, loadImage } from "canvas";
import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import fetch from "node-fetch";
import { CommandOptionType, MessageFile } from "slash-create";
import { Item } from "../../database/entities/Item";
import * as secrets from "configuration/secrets.json";

export const Options = createOptions(<const>{
    description: "Generates a weekly overview for your last.fm stats",
    options: [
        { name: "size", description: "The number of rows and columns in the output", type: CommandOptionType.INTEGER }
    ]
});

class Album {
    artist: string;
    name: string;
    playcount: string;
    image: string;
    constructor(album: any) {
        this.artist = album.artist.name;
        this.name = album.name;
        this.playcount = album.playcount;
        this.image = album.image[album.image.length - 1]["#text"];
    }
    getLine() {
        return { font: "Arial", color: "white", text: this.artist + "\n" + this.name + " " + this.playcount };
    }
}

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    const size = ctx.opts.size || 3;

    //INPUTS FORMAT: !weekly 3x3 90
    const userItem = await ctx.connection.getRepository(Item).findOne({ identifier: ctx.member.id, type: "FM" });
    if (!userItem) throw new CommandError("You must use `/fm set` first!");

    const username = userItem.title;
    const timequery = "7 days";

    //GET DATE STRING overall | 7day | 1month | 3month | 6month | 12month
    let date;
    switch (timequery.toLowerCase().split(" ").join("")) {
        case "3":
        case "90":
        case "90days":
        case "threemonths":
        case "3month":
        case "3months":
            date = "3month";
            break;
        case "7":
        case "7day":
        case "7days":
        case "oneweek":
        case "1week":
            date = "7day";
            break;
        case "1":
        case "1month":
        case "onemonth":
            date = "1month";
            break;
        case "6":
        case "sixmonths":
        case "6month":
        case "6months":
            date = "6month";
            break;
        case "12":
        case "oneyear":
        case "1year":
        case "12months":
        case "12month":
            date = "12month";
            break;
        case "all":
        case "alltime":
        case "overall":
        case "forever":
            date = "overall";
            break;
        default:
            date = "7day";
            break;
    }

    //FETCH LAST FM DATA
    const req_url = `http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=${date}&api_key=${secrets.apis.lastfm}&format=json`;
    console.log(req_url);
    const collected = [];
    try {
        const r = await fetch(req_url);
        const json = (await r.json())["topalbums"]["album"];
        const num = size ** 2;

        collected.push(...json.slice(0, num).map((a: any) => new Album(a)));
    } catch (e) {
        console.log(e, /ERROR/);
    }
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
