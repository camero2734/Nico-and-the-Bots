import { ButtonStyle, ColorResolvable } from "discord.js";
import { emojiIDs } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { CommandError } from "../../Configuration/definitions";
import { prisma } from "../../Helpers/prisma-init";

export enum AlbumName {
    SelfTitled = "Twenty One Pilots",
    RegionalAtBest = "Regional At Best",
    Vessel = "Vessel",
    Blurryface = "Blurryface",
    Trench = "Trench",
    ScaledAndIcy = "Scaled And Icy",
    Singles = "Singles/Covers",
}

export interface Album {
    name: AlbumName;
    image?: string;
    color: ColorResolvable;
    emoji: string;
    songs: SongContender[];
}

export interface SongContender {
    name: string;
    image?: string;
}

export const IMAGE_SIZE = 1000;
export const PREFIX = "SongBattle2024Test-";

export const albums = [
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
            { name: "Cancer (MCR Cover)", image: "https://i.scdn.co/image/ab67616d00001e020fde79bfa5e23cb9cbdcd142" },
            { name: "Heathens", image: "https://i.scdn.co/image/ab67616d00001e022ca3ba8f334ca5a5f0312efb" },
            { name: "Level of Concern", image: "https://i.scdn.co/image/ab67616d00001e02ab2f8973949159695f65df7b" },
            { name: "Christmas Saves the Year", image: "https://i.scdn.co/image/ab67616d00001e02fdd772158c3af54caf44879b" },
            { name: "Twenty-Four (Switchfoot Cover)", image: "https://i.scdn.co/image/ab67616d00001e0243882fdb47a06d880f61efdc" },
        ]
    },
] satisfies Album[];

export const embedFooter = (totalVotes: number) => `${totalVotes} vote${F.plural(totalVotes)} | Votes are anonymous | Voting ends in 24 hours`;

export const buttonColors: Partial<Record<ButtonStyle, string>> = {
    [ButtonStyle.Primary]: "#5865F2",
    [ButtonStyle.Secondary]: "#4F545C",
    [ButtonStyle.Success]: "#43B581",
    [ButtonStyle.Danger]: "#F04747",
};

const DELIMITER = "%";
export function toSongId(song: SongContender, album: Album) {
    return [song.name, album.name].join(DELIMITER);
}

export function fromSongId(id: string): { song: SongContender, album: Album } {
    const [songName, albumName] = id.split(DELIMITER);
    const songs = albums.map(a => a.songs.map(s => ({ ...s, album: a }))).flat();
    const song = songs.find(s => s.name === songName && s.album.name === albumName);

    if (!song) throw new CommandError("Song not found");

    return { song, album: song.album }
}

export interface SongBattleHistory {
    rounds: number;
    eliminated: boolean;
}

export enum Result {
    Song1,
    Song2,
    Tie
}

export async function determineNextMatchup(): Promise<{
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

    let numTies = 0;

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
            numTies++; // They also add to the total number of matches
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
    const totalMatches = histories.size - 1 + numTies;

    return { song1, song2, album1, album2, nextBattleNumber: previousBattlesRaw.length + 1, result, totalMatches };
}
