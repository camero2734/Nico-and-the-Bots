import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder, italic } from "discord.js";
import { nanoid } from "nanoid";
import { guild } from "../../../app";
import { channelIDs, emojiIDs } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";

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
const PREFIX = "SongBattle2024Test-";

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

const embedFooter = (totalVotes: number) => `${totalVotes} votes | Votes are anonymous | Voting ends in 24 hours`;

const entrypoint = new ManualEntrypoint();

const buttonColors: Partial<Record<ButtonStyle, string>> = {
    [ButtonStyle.Primary]: "#5865F2",
    [ButtonStyle.Secondary]: "#4F545C",
    [ButtonStyle.Success]: "#43B581",
    [ButtonStyle.Danger]: "#F04747",
};

export async function songBattleCron() {
    // Get song battle channel
    const channel = await guild.channels.fetch(channelIDs.songbattles);
    if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

    // Determine the next matchup
    const { song1, song2, album1, album2, nextBattleNumber, result, totalMatches } = await determineNextMatchup();

    // Update the previous battle's message
    const previousPoll = await prisma.poll.findFirst({
        where: {
            name: { startsWith: PREFIX },
        },
        orderBy: { id: "desc" }
    });
    const previousMessageId = previousPoll?.options[2];

    if (previousMessageId) {
        const previousMessage = await channel.messages?.fetch(previousMessageId);

        if (previousMessage) {
            const embed = new EmbedBuilder(previousMessage.embeds[0].data);
            const { song: song1, album: album1 } = fromSongId(previousPoll.options[0]);
            const { song: song2, album: album2 } = fromSongId(previousPoll.options[1]);
            embed.addFields({
                name: "🏆 Winner",
                value: (() => {
                    if (result === Result.Song1) return `${song1.name}, ${italic(album1.name)}`;
                    if (result === Result.Song2) return `${song2.name}, ${italic(album2.name)}`;
                    return "... Neither (Tie)";
                })()
            });

            // Disable the buttons
            const actionRow = new ActionRowBuilder<ButtonBuilder>(previousMessage.components[0]);
            actionRow.components.forEach(c => c.setDisabled(true));

            await previousMessage.edit({ embeds: [embed], components: [actionRow] });
        }
    }

    // Pick two random button colors
    const [button1, button2] = F.shuffle(F.entries(buttonColors)).slice(0, 2);

    // Create the image
    const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const cctx = canvas.getContext("2d");

    const leftImageUrl = album1.image || song1.image;
    const rightImageUrl = album2.image || song2.image;
    if (!leftImageUrl || !rightImageUrl) throw new CommandError("Missing image(s)");

    const leftImage = await loadImage(leftImageUrl);
    const rightImage = await loadImage(rightImageUrl);

    cctx.drawImage(leftImage, 0, 0, leftImage.width / 2, leftImage.height, 0, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    // Add a tint to the left iamge
    cctx.fillStyle = button1[1]!;
    cctx.globalAlpha = 0.4;
    cctx.fillRect(0, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    cctx.globalAlpha = 1;

    cctx.drawImage(rightImage, rightImage.width / 2, 0, rightImage.width / 2, rightImage.height, IMAGE_SIZE / 2, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    // Add a tint to the right image
    cctx.fillStyle = button2[1]!;
    cctx.globalAlpha = 0.4;
    cctx.fillRect(IMAGE_SIZE / 2, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    cctx.globalAlpha = 1;

    // Draw a divider
    const DIVIDER_WIDTH = 10;
    cctx.fillStyle = "white";
    cctx.fillRect(IMAGE_SIZE / 2 - DIVIDER_WIDTH / 2, 0, DIVIDER_WIDTH, IMAGE_SIZE);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "battle.png" });

    const startsAt = new Date();

    // Placeholder message
    const startEmbed = new EmbedBuilder().setDescription("Receiving new song battle...");
    const m = await channel.send({ embeds: [startEmbed] });

    // Create database poll
    const pollName = `${PREFIX}${nextBattleNumber}-${nanoid(10)}`;
    const poll = await prisma.poll.create({
        data: {
            name: pollName,
            options: [toSongId(song1, album1), toSongId(song2, album2), m.id],
        }
    });

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(`Battle #${nextBattleNumber} / ${totalMatches}`)
        .setThumbnail("attachment://battle.png")
        .addFields([
            { name: song1.name, value: italic(album1.name), inline: true },
            { name: song2.name, value: italic(album2.name), inline: true },
        ])
        .setColor(album1.color)
        .setFooter({ text: embedFooter(0) })
        .setTimestamp(startsAt);

    // Create message components
    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder()
            .setCustomId(genButtonId({ songId: toSongId(song1, album1), pollId: poll.id.toString() }))
            .setStyle(button1[0])
            .setLabel(song1.name)
            .setEmoji(album1.emoji),
        new ButtonBuilder()
            .setCustomId(genButtonId({ songId: toSongId(song2, album2), pollId: poll.id.toString() }))
            .setStyle(button2[0])
            .setLabel(song2.name)
            .setEmoji(album2.emoji)
    ]);

    // Send the main message
    await m.edit({ embeds: [embed], files: [attachment], components: [actionRow] });

    // Create a discussion thread
    // TODO: re-enable me, annoying for testing
    // const endsAt = addHours(startsAt, 24);
    // const thread = await m.startThread({
    //     name: `Song Battle #${nextBattleNumber}`,
    //     autoArchiveDuration: ThreadAutoArchiveDuration.OneDay
    // });

    // await thread.send(`**Welcome to the song battle!** Discuss the two songs here. The winner will be revealed ${F.discordTimestamp(endsAt, "relative")}`);
}

const genButtonId = entrypoint.addInteractionListener("songBattleButton", <const>["pollId", "songId"], async (ctx, args) => {
    await ctx.deferReply({ ephemeral: true });
    if (!ctx.isButton()) return;

    // Find associated poll
    const pollId = parseInt(args.pollId);
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new CommandError("Poll not found");

    const choiceId = poll.options.findIndex(o => o === args.songId);

    // Check if the user has already voted
    const existingVote = await prisma.vote.findFirst({
        select: { id: true },
        where: { pollId, userId: ctx.user.id }
    });

    // Create or update the vote
    await prisma.vote.upsert({
        where: { pollId_userId: { pollId, userId: ctx.user.id } },
        create: {
            pollId,
            userId: ctx.user.id,
            choices: [choiceId]
        },
        update: {
            choices: [choiceId]
        }
    });

    const totalVotes = await prisma.vote.count({ where: { pollId } });

    const { song, album } = fromSongId(args.songId);

    const embed = new EmbedBuilder(ctx.message.embeds[0].data);
    embed.setFooter({ text: embedFooter(totalVotes) });

    await ctx.message.edit({ embeds: [embed], attachments: [...ctx.message.attachments.values()] });

    if (existingVote) {
        await ctx.editReply({ content: `You changed your vote to ${song.name} on the album ${album.name}` });
    } else {
        await ctx.editReply({ content: `You voted for ${song.name} on the album ${album.name}` });
    }
});

// function getRandomSong(): { song: SongContender, album: Album } {
//     const songs = albums.map(a => a.songs.map(s => ({ ...s, album: a }))).flat();
//     const song = songs[Math.floor(Math.random() * songs.length)];

//     return { song, album: song.album };
// }

const DELIMITER = "%";
function toSongId(song: SongContender, album: Album) {
    return [song.name, album.name].join(DELIMITER);
}

function fromSongId(id: string): { song: SongContender, album: Album } {
    const [songName, albumName] = id.split(DELIMITER);
    const songs = albums.map(a => a.songs.map(s => ({ ...s, album: a }))).flat();
    const song = songs.find(s => s.name === songName && s.album.name === albumName);

    if (!song) throw new CommandError("Song not found");

    return { song, album: song.album }
}

interface SongBattleHistory {
    rounds: number;
    eliminated: boolean;
}

enum Result {
    Song1,
    Song2,
    Tie
}

async function determineNextMatchup(): Promise<{
    song1: SongContender;
    song2: SongContender;
    album1: Album;
    album2: Album;
    nextBattleNumber: number;
    result?: Result;
    totalMatches: number;
}> {
    const previousBattlesRaw = await prisma.poll.findMany({
        where: {
            name: { startsWith: PREFIX }
        },
        include: { votes: true },
        orderBy: { id: "asc" }
    });

    const histories: Map<string, SongBattleHistory> = new Map();

    // Initialize all songs
    for (const album of albums) {
        for (const song of album.songs) {
            histories.set(toSongId(song, album), { rounds: 0, eliminated: false });
        }
    }

    // The last battle's result will be stored here
    let result: Result | undefined;

    // Go through rounds and eliminate songs
    for (const battle of previousBattlesRaw) {
        const totalVotes = battle.votes.length;
        const song1Votes = battle.votes.filter(v => v.choices[0] === 0).length;
        const song2Votes = totalVotes - song1Votes;

        const song1 = histories.get(battle.options[0]);
        const song2 = histories.get(battle.options[1]);

        if (!song1 || !song2) throw new CommandError("Song not found");

        if (song1Votes > song2Votes) {
            song2.eliminated = true;
            result = Result.Song1;
        } else if (song2Votes > song1Votes) {
            song1.eliminated = true;
            result = Result.Song2;
        } else {
            // Tie -- these songs are thrown back into the pool
            // hopefully they won't be matched up again :)
            result = Result.Tie;
        }

        song1.rounds++;
        song2.rounds++;
    }

    // We want two random songs such that:
    // - They have not been eliminated
    // - They've been in the fewest number of rounds
    //
    // This approximates a tournament bracket w/o having to store the entire bracket
    const eligibleSongs = Array.from(histories.entries()).filter(([_, h]) => !h.eliminated);
    const sorted = F.shuffle(eligibleSongs).sort((a, b) => a[1].rounds - b[1].rounds);
    const [song1Id, song2Id] = sorted.slice(0, 2).map(s => s[0]);

    const { song: song1, album: album1 } = fromSongId(song1Id);
    const { song: song2, album: album2 } = fromSongId(song2Id);

    // The total number of matches that will be played
    const totalMatches = histories.size - 1;

    return { song1, song2, album1, album2, nextBattleNumber: previousBattlesRaw.length + 1, result, totalMatches };
}

export default entrypoint;
