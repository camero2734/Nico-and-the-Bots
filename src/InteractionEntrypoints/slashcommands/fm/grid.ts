import { Image, createCanvas, loadImage } from "@napi-rs/canvas";
import { ApplicationCommandOptionType, Colors, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { Album, fm, getFMUsername } from "./_consts";

const command = new SlashCommand({
  description: "Generates a weekly overview for your last.fm stats",
  options: [
    {
      name: "size",
      description: "The number of rows and columns in the output",
      type: ApplicationCommandOptionType.Integer,
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
        { name: "Overall", value: "overall" },
      ],
    },
    {
      name: "user",
      description: "The user in the server to lookup",
      required: false,
      type: ApplicationCommandOptionType.User,
    },
    {
      name: "username",
      description: "The Last.FM username to lookup",
      required: false,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "relative",
      description: "Change the brightness of the album art based on relative playcount",
      required: false,
      type: ApplicationCommandOptionType.Boolean,
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const username = await getFMUsername(ctx.opts.username, ctx.opts.user, ctx.member);

  const start = Date.now();

  const size = ctx.opts.size || 3;
  const date = ctx.opts.timeperiod || "7day";
  const num = size ** 2;

  if (size > 20) throw new CommandError("The grid can be at most 20x20");

  const res = await fm.user.getTopAlbums({
    username,
    period: date,
  } as { username: typeof username });
  const topAlbums = res.albums;

  const collected = topAlbums.slice(0, num).map((a) => new Album(a));

  //CREATE COLLAGE
  const width = size * 200;
  const height = size * 200;
  const canvas = createCanvas(width, height);
  const cctx = canvas.getContext("2d");

  const imageSize = size < 15 ? "/300x300/" : "/34s/";

  console.log(JSON.stringify(collected));

  const images = await Promise.allSettled(
    collected.map((c) => loadImage(c.image?.replace("/300x300/", imageSize) || "")),
  );

  cctx.fillStyle = "white";
  cctx.strokeStyle = "black";

  const maxPlaycount = Math.max(...collected.map((a) => a.playcount));

  for (let i = 0; i < collected.length; i++) {
    const album = collected[i];
    const fetchImage = images[i];
    const image = fetchImage.status === "fulfilled" && fetchImage.value ? fetchImage.value : new Image();

    const x = 200 * (i % size);
    const y = 200 * Math.floor(i / size);
    cctx.drawImage(image, x, y, 200, 200);

    if (ctx.opts.relative) {
      const opacity = (0.9 * album.playcount) / maxPlaycount + 0.1;
      cctx.fillStyle = `rgba(0, 0, 0, ${1 - opacity})`;
      cctx.fillRect(x, y, 200, 200);
    }

    cctx.strokeText(album.name || "", x, y + 10);
    cctx.fillText(album.name || "", x, y + 10);
  }

  const lastFMIcon = "http://icons.iconarchive.com/icons/sicons/flat-shadow-social/512/lastfm-icon.png";
  const embed = new EmbedBuilder()
    .setAuthor({
      name: username,
      iconURL: lastFMIcon,
      url: `https://www.last.fm/user/${username}`,
    })
    .setImage("attachment://chart.png")
    .setColor(Colors.Red)
    .setDescription(`${size}x${size}, ${date}`)
    .setFooter({ text: `${Date.now() - start}ms` });

  await ctx.send({
    embeds: [embed.toJSON()],
    files: [{ name: "chart.png", attachment: canvas.toBuffer("image/png") }],
  });
});

export default command;
