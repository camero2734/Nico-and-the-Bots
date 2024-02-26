import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder, ThreadAutoArchiveDuration, bold, italic } from "discord.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { CommandError } from "../../../Configuration/definitions";
import { emojiIDs } from "../../../Configuration/config";
import { addHours } from "date-fns";
import F from "../../../Helpers/funcs";

enum AlbumName {
    SelfTitled = "Twenty One Pilots",
    RegionalAtBest = "Regional At Best",
    Vessel = "Vessel",
    Blurryface = "Blurryface",
    Trench = "Trench",
    ScaledAndIcy = "Scaled And Icy",
    Singles = "Singles",
}

interface Album {
    name: AlbumName;
    image?: string;
    color: ColorResolvable;
    emoji: string;
    songs: SongContender[];
}

interface SongContender {
    name: string;
    image?: string;
}

const IMAGE_SIZE = 1000;

const albums = [
    {
        name: AlbumName.SelfTitled,
        image: "https://i.scdn.co/image/ab67616d0000b2734f5687326079d90e731a10a6",
        color: "#8cb82c",
        emoji: emojiIDs.albums.selfTitled,
        songs: [
            { name: "Implicit Demand for Proof" },
            { name: "Fall Away" },
            { name: "The Pantaloon" },
            { name: "Addict With a Pen" },
            { name: "Friend, Please" },
            { name: "March to the Sea" },
            { name: "Johnny Boy" },
            { name: "Oh Ms Believer" },
            { name: "Air Catcher" },
            { name: "Trapdoor" },
            { name: "A Car, a Torch, a Death" },
            { name: "Taxi Cab" },
            { name: "Before You Start Your Day" },
            { name: "Isle of Flightless Birds" },
        ]
    },
    {
        name: AlbumName.RegionalAtBest,
        image: "https://i.scdn.co/image/ab67616d0000b2739e09415e1975a4fae4389f1d",
        color: "#9bc1db",
        emoji: emojiIDs.albums.regionalAtBest,
        songs: [
            { name: "Guns for Hands" },
            { name: "Holding on to You" },
            { name: "Ode to Sleep" },
            { name: "Slowtown" },
            { name: "Car Radio" },
            { name: "Forest" },
            { name: "Glowing Eyes" },
            { name: "Kitchen Sink" },
            { name: "Anathema" },
            { name: "Lovely" },
            { name: "Ruby" },
            { name: "Trees" },
            { name: "Be Concerned" },
            { name: "Clear" },
        ]
    },
    {
        name: AlbumName.Vessel,
        image: "https://i.scdn.co/image/ab67616d0000b273d263500f1f97e978daa5ceb1",
        color: "#aebfd9",
        emoji: emojiIDs.albums.vessel,
        songs: [
            { name: "Ode to Sleep" },
            { name: "Holding on to You" },
            { name: "Migraine" },
            { name: "House of Gold" },
            { name: "Car Radio" },
            { name: "Semi-Automatic" },
            { name: "Screen" },
            { name: "The Run and Go" },
            { name: "Fake You Out" },
            { name: "Guns for Hands" },
            { name: "Trees" },
            { name: "Truce" },
        ]
    },
    {
        name: AlbumName.Blurryface,
        image: "https://i.scdn.co/image/ab67616d00001e02352e5ec301a02278ffe53d14",
        color: "#ec5748",
        emoji: emojiIDs.albums.blurryface,
        songs: [
            { name: "Heavydirtysoul" },
            { name: "Stressed Out" },
            { name: "Ride" },
            { name: "Fairly Local" },
            { name: "Tear in My Heart" },
            { name: "Lane Boy" },
            { name: "The Judge" },
            { name: "Doubt" },
            { name: "Polarize" },
            { name: "We Don't Believe What's on TV" },
            { name: "Message Man" },
            { name: "Hometown" },
            { name: "Not Today" },
            { name: "Goner" },
        ]
    },
    {
        name: AlbumName.Trench,
        image: "https://i.scdn.co/image/ab67616d00001e027a1bbe4ec7066c9db1d0f398",
        color: "#fce300",
        emoji: emojiIDs.albums.trench,
        songs: [
            { name: "Jumpsuit" },
            { name: "Levitate" },
            { name: "Morph" },
            { name: "My Blood" },
            { name: "Chlorine" },
            { name: "Smithereens" },
            { name: "Neon Gravestones" },
            { name: "The Hype" },
            { name: "Nico and the Niners" },
            { name: "Cut My Lip" },
            { name: "Bandito" },
            { name: "Pet Cheetah" },
            { name: "Legend" },
            { name: "Leave the City" },
        ]
    },
    {
        name: AlbumName.ScaledAndIcy,
        image: "https://i.scdn.co/image/ab67616d00001e02239ee8e0c619611d8beef008",
        color: "#01dead",
        emoji: emojiIDs.albums.scaledAndIcy,
        songs: [
            { name: "Good Day" },
            { name: "Choker" },
            { name: "Shy Away" },
            { name: "The Outside" },
            { name: "Saturday" },
            { name: "Never Take It" },
            { name: "Mulberry Street" },
            { name: "Formidable" },
            { name: "Bounce Man" },
            { name: "No Chances" },
            { name: "Redecorate" },
        ]
    },
    {
        name: AlbumName.Singles,
        color: "#FFFFFF",
        emoji: "1211716502621917215",
        songs: [
            { name: "Cancer", image: "https://i.scdn.co/image/ab67616d00001e020fde79bfa5e23cb9cbdcd142" },
            { name: "Heathens", image: "https://i.scdn.co/image/ab67616d00001e022ca3ba8f334ca5a5f0312efb" },
            { name: "Level of Concern", image: "https://i.scdn.co/image/ab67616d00001e02ab2f8973949159695f65df7b" },
            { name: "Christmas Saves the Year", image: "https://i.scdn.co/image/ab67616d00001e02fdd772158c3af54caf44879b" },
        ]
    },
] satisfies Album[];

const command = new SlashCommand(<const>{
    description: "Test command for song battles",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const { album: album1, song: song1 } = getRandomSong();
    const { album: album2, song: song2 } = getRandomSong();

    const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const cctx = canvas.getContext("2d");

    const leftImageUrl = album1.image || song1.image;
    const rightImageUrl = album2.image || song2.image;
    if (!leftImageUrl || !rightImageUrl) throw new CommandError("Missing image(s)");

    const leftImage = await loadImage(leftImageUrl);
    const rightImage = await loadImage(rightImageUrl);

    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    cctx.drawImage(leftImage, 0, 0, leftImage.width / 2, leftImage.height, 0, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    // Add a blue aura to the left iamge
    cctx.fillStyle = "#5865F2";
    cctx.globalAlpha = 0.4;
    cctx.fillRect(0, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    cctx.globalAlpha = 1;

    cctx.drawImage(rightImage, rightImage.width / 2, 0, rightImage.width / 2, rightImage.height, IMAGE_SIZE / 2, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    // Add a green tint to the right image
    cctx.fillStyle = "#43B581";
    cctx.globalAlpha = 0.4;
    cctx.fillRect(IMAGE_SIZE / 2, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    cctx.globalAlpha = 1;

    // Draw a divider
    const DIVIDER_WIDTH = 10;
    cctx.fillStyle = "white";
    cctx.fillRect(IMAGE_SIZE / 2 - DIVIDER_WIDTH / 2, 0, DIVIDER_WIDTH, IMAGE_SIZE);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "battle.png" });

    const endsAt = addHours(new Date(), 24);

    const battleNumber = 1;
    const embed = new EmbedBuilder()
        .setTitle(`Battle #${battleNumber}: ${bold("Which song do you prefer?")}`)
        .setThumbnail("attachment://battle.png")
        .addFields([
            { name: song1.name, value: italic(album1.name), inline: true },
            { name: song2.name, value: italic(album2.name), inline: true },
        ])
        .setColor(album1.color)
        .setFooter({ text: "0 votes | Votes are anonymous | Voting ends" })
        .setTimestamp(endsAt);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder()
            .setCustomId(genButtonId({ songName: song1.name }))
            .setStyle(ButtonStyle.Primary)
            .setLabel(song1.name)
            .setEmoji(album1.emoji),
        new ButtonBuilder()
            .setCustomId(genButtonId({ songName: song2.name }))
            .setStyle(ButtonStyle.Success)
            .setLabel(song2.name)
            .setEmoji(album2.emoji)
    ]);

    const m = await ctx.editReply({ embeds: [embed], files: [attachment], components: [actionRow] });

    // Create a discussion thread
    const thread = await m.startThread({
        name: `Song Battle #${battleNumber}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay
    });

    await thread.send(`**Welcome to the song battle! Discuss the two songs here. The winner will be revealed ${F.discordTimestamp(endsAt, "relative")}`);
});

const genButtonId = command.addInteractionListener("songBattleButton", <const>["songName"], async (ctx, args) => {
    await ctx.deferReply({ ephemeral: true });
    if (!ctx.isButton()) return;

    const { song, album } = getByName(args.songName);

    const [total, ...rest] = ctx.message.embeds[0].data.footer!.text.split(" ");
    const totalVotes = parseInt(total) + 1;

    const embed = new EmbedBuilder(ctx.message.embeds[0].data);
    console.log(`Setting footer to: ${[totalVotes, ...rest].join(" ")}`)
    embed.setFooter({ text: [totalVotes, ...rest].join(" ") });

    await ctx.message.edit({ embeds: [embed], attachments: [...ctx.message.attachments.values()] });
    await ctx.editReply({ content: `You voted for ${song.name} on the album ${album.name}` });
});

function getRandomSong(): { song: SongContender, album: Album } {
    const songs = albums.map(a => a.songs.map(s => ({ ...s, album: a }))).flat();
    const song = songs[Math.floor(Math.random() * songs.length)];

    return { song, album: song.album };
}

function getByName(songName: string): { song: SongContender, album: Album } {
    const songs = albums.map(a => a.songs.map(s => ({ ...s, album: a }))).flat();
    const song = songs.find(s => s.name === songName);

    if (!song) throw new CommandError("Song not found");

    return { song, album: song.album }
}

export default command;
