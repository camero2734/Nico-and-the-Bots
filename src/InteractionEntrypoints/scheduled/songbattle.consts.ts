import { ButtonStyle, ColorResolvable } from "discord.js";
import { emojiIDs } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { CommandError } from "../../Configuration/definitions";
import { prisma } from "../../Helpers/prisma-init";
import { Poll, Vote } from "@prisma/client";

export const NUMBER_OF_ELIMINATIONS = 2;

export enum AlbumName {
    SelfTitled = "Twenty One Pilots",
    RegionalAtBest = "Regional At Best",
    Vessel = "Vessel",
    Blurryface = "Blurryface",
    Trench = "Trench",
    ScaledAndIcy = "Scaled And Icy",
    Clancy = "Clancy",
    Singles = "Singles",
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
    /** YouTube video link */
    yt: string;
}

export const IMAGE_SIZE = 1000;
export const PREFIX = "SongBattle2024ClancyBattle-";

export const albums = [
    // {
    //     name: AlbumName.SelfTitled,
    //     image: "https://i.scdn.co/image/ab67616d0000b2734f5687326079d90e731a10a6",
    //     color: "#8cb82c",
    //     emoji: emojiIDs.albums.selfTitled,
    //     songs: [
    //         { name: "Implicit Demand for Proof" },
    //         { name: "Fall Away" },
    //         { name: "The Pantaloon" },
    //         { name: "Addict With a Pen" },
    //         { name: "Friend, Please" },
    //         { name: "March to the Sea" },
    //         { name: "Johnny Boy" },
    //         { name: "Oh Ms Believer" },
    //         { name: "Air Catcher" },
    //         { name: "Trapdoor" },
    //         { name: "A Car, a Torch, a Death" },
    //         { name: "Taxi Cab" },
    //         { name: "Before You Start Your Day" },
    //         { name: "Isle of Flightless Birds" },
    //     ]
    // },
    // {
    //     name: AlbumName.RegionalAtBest,
    //     image: "https://i.scdn.co/image/ab67616d0000b2739e09415e1975a4fae4389f1d",
    //     color: "#9bc1db",
    //     emoji: emojiIDs.albums.regionalAtBest,
    //     songs: [
    //         { name: "Guns for Hands" },
    //         { name: "Holding on to You" },
    //         { name: "Ode to Sleep" },
    //         { name: "Slowtown" },
    //         { name: "Car Radio" },
    //         { name: "Forest" },
    //         { name: "Glowing Eyes" },
    //         { name: "Kitchen Sink" },
    //         { name: "Anathema" },
    //         { name: "Lovely" },
    //         { name: "Ruby" },
    //         { name: "Trees" },
    //         { name: "Be Concerned" },
    //         { name: "Clear" },
    //     ]
    // },
    // {
    //     name: AlbumName.Vessel,
    //     image: "https://i.scdn.co/image/ab67616d0000b273d263500f1f97e978daa5ceb1",
    //     color: "#aebfd9",
    //     emoji: emojiIDs.albums.vessel,
    //     songs: [
    //         { name: "Ode to Sleep" },
    //         { name: "Holding on to You" },
    //         { name: "Migraine" },
    //         { name: "House of Gold" },
    //         { name: "Car Radio" },
    //         { name: "Semi-Automatic" },
    //         { name: "Screen" },
    //         { name: "The Run and Go" },
    //         { name: "Fake You Out" },
    //         { name: "Guns for Hands" },
    //         { name: "Trees" },
    //         { name: "Truce" },
    //         { name: "Lovely (Bonus Track Version)" }
    //     ]
    // },
    // {
    //     name: AlbumName.Blurryface,
    //     image: "https://i.scdn.co/image/ab67616d00001e02352e5ec301a02278ffe53d14",
    //     color: "#ec5748",
    //     emoji: emojiIDs.albums.blurryface,
    //     songs: [
    //         { name: "Heavydirtysoul" },
    //         { name: "Stressed Out" },
    //         { name: "Ride" },
    //         { name: "Fairly Local" },
    //         { name: "Tear in My Heart" },
    //         { name: "Lane Boy" },
    //         { name: "The Judge" },
    //         { name: "Doubt" },
    //         { name: "Polarize" },
    //         { name: "We Don't Believe What's on TV" },
    //         { name: "Message Man" },
    //         { name: "Hometown" },
    //         { name: "Not Today" },
    //         { name: "Goner" },
    //     ]
    // },
    // {
    //     name: AlbumName.Trench,
    //     image: "https://i.scdn.co/image/ab67616d00001e027a1bbe4ec7066c9db1d0f398",
    //     color: "#fce300",
    //     emoji: emojiIDs.albums.trench,
    //     songs: [
    //         { name: "Jumpsuit" },
    //         { name: "Levitate" },
    //         { name: "Morph" },
    //         { name: "My Blood" },
    //         { name: "Chlorine" },
    //         { name: "Smithereens" },
    //         { name: "Neon Gravestones" },
    //         { name: "The Hype" },
    //         { name: "Nico and the Niners" },
    //         { name: "Cut My Lip" },
    //         { name: "Bandito" },
    //         { name: "Pet Cheetah" },
    //         { name: "Legend" },
    //         { name: "Leave the City" },
    //     ]
    // },
    // {
    //     name: AlbumName.ScaledAndIcy,
    //     image: "https://i.scdn.co/image/ab67616d00001e02239ee8e0c619611d8beef008",
    //     color: "#01dead",
    //     emoji: emojiIDs.albums.scaledAndIcy,
    //     songs: [
    //         { name: "Good Day" },
    //         { name: "Choker" },
    //         { name: "Shy Away" },
    //         { name: "The Outside" },
    //         { name: "Saturday" },
    //         { name: "Never Take It" },
    //         { name: "Mulberry Street" },
    //         { name: "Formidable" },
    //         { name: "Bounce Man" },
    //         { name: "No Chances" },
    //         { name: "Redecorate" },
    //     ]
    // },
    {
        name: AlbumName.Clancy,
        image: "https://i.scdn.co/image/ab67616d00001e02d1e9c8027e794228dc35ad26",
        color: "#E33E36",
        emoji: emojiIDs.albums.clancy,
        songs: [
            { name: "Overcompensate", yt: "https://youtu.be/53tgVlXBZVg" },
            { name: "Next Semester", yt: "https://youtu.be/a5i-KdUQ47o" },
            { name: "Backslide", yt: "https://youtu.be/YAmLMohrus4" },
            { name: "Midwest Indigo", yt: "https://youtu.be/mREOvIgImmo" },
            { name: "Routines in the Night", yt: "https://youtu.be/AupwoN8QvbU" },
            { name: "Vignette", yt: "https://youtu.be/eoEKwwbPfvc" },
            { name: "The Craving (Jenna's Version)", yt: "https://youtu.be/yN6OQncqqI0" },
            { name: "Lavish", yt: "https://youtu.be/flYgpeWsC2E" },
            { name: "Navigating", yt: "https://youtu.be/07YtBj3BEBQ" },
            { name: "Snap Back", yt: "https://youtu.be/eZptwvjKjk4" },
            { name: "Oldies Station", yt: "https://youtu.be/fBE_2sHDt4E" },
            { name: "At the Risk of Feeling Dumb", yt: "https://youtu.be/TnoWOgAD054" },
            { name: "Paladin Strait", yt: "https://youtu.be/mix9YfaaNa0" },
        ]
    },
    {
        name: AlbumName.Singles,
        color: "#FFFFFF",
        emoji: emojiIDs.albums.clancy,
        songs: [
            // { name: "Cancer (MCR Cover)", image: "https://i.scdn.co/image/ab67616d00001e020fde79bfa5e23cb9cbdcd142" },
            // { name: "Heathens", image: "https://i.scdn.co/image/ab67616d00001e022ca3ba8f334ca5a5f0312efb" },
            // { name: "Level of Concern", image: "https://i.scdn.co/image/ab67616d00001e02ab2f8973949159695f65df7b" },
            // { name: "Christmas Saves the Year", image: "https://i.scdn.co/image/ab67616d00001e02fdd772158c3af54caf44879b" },
            // { name: "Twenty-Four (Switchfoot Cover)", image: "https://i.scdn.co/image/ab67616d00001e0243882fdb47a06d880f61efdc" },
            // { name: "Time to Say Goodbye", image: "https://i1.sndcdn.com/artworks-000005083596-vd83l9-t500x500.jpg" },
            { name: "The Craving (single version)", image: "https://i.scdn.co/image/ab67616d00001e02d1e9c8027e794228dc35ad26", yt: "https://youtu.be/H3OiQEOcrA8" },
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

    if (!song) throw new CommandError(`Song not found: ${songName} in album ${albumName}`);

    return { song, album: song.album }
}

export interface SongBattleHistory {
    rounds: number;
    eliminations: number;
}

export enum Result {
    Song1,
    Song2,
    Tie
}

export async function calculateHistory() {
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
            histories.set(toSongId(song, album), { rounds: 0, eliminations: 0 });
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

        if (!song1 || !song2) throw new CommandError(`Song not found in history: ${battle.options[0]} or ${battle.options[1]}`);

        if (song1Votes > song2Votes) {
            song2.eliminations++;
            result = Result.Song1;
        } else if (song2Votes > song1Votes) {
            song1.eliminations++;
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
    const eligibleSongs = Array.from(histories.entries()).filter(([_, h]) => h.eliminations < NUMBER_OF_ELIMINATIONS);
    const sorted = F.shuffle(eligibleSongs).sort((a, b) => a[1].rounds - b[1].rounds);

    const fewestEliminations = Math.min(...sorted.map(s => s[1].eliminations));

    return { histories, sorted, numTies, previousBattlesRaw, result, fewestEliminations };
}

export function determineResult(poll: Poll & { votes: Vote[] }): Result {
    const totalVotes = poll.votes.length;
    const song1Votes = poll.votes.filter(v => v.choices[0] === 0).length;
    const song2Votes = totalVotes - song1Votes;

    if (song1Votes > song2Votes) {
        return Result.Song1;
    } else if (song2Votes > song1Votes) {
        return Result.Song2;
    } else {
        return Result.Tie;
    }
}

export function findFirstUnmatchedSongs(sorted: [string, SongBattleHistory][], previousBattlesRaw: Poll[]) {
    let maximumRound1 = Infinity;
    let maximumRound2 = Infinity;
    let finalSong1Id: string | undefined;
    let finalSong2Id: string | undefined;

    // Find the first two songs that haven't been matched up yet
    for (const [song1Id, history] of sorted) {
        // This song is in a higher bracket than an earlier found match, no need to continue
        if (history.rounds > maximumRound1) break;

        const previousBattles = previousBattlesRaw.filter(b => b.options.includes(song1Id));

        for (const [song2Id, history2] of sorted) {
            // We've already found a better match
            if (history2.rounds >= maximumRound2) break;
            // Can't match a song against itself
            if (song1Id === song2Id) continue;
            // This song has already gone against song1
            if (previousBattles.some(b => b.options.includes(song2Id))) continue;

            finalSong1Id = song1Id;
            finalSong2Id = song2Id;
            maximumRound1 = history.rounds;
            maximumRound2 = history2.rounds;
            break;
        }
    }

    if (finalSong1Id && finalSong2Id) {
        return { song1Id: finalSong1Id, song2Id: finalSong2Id };
    }

    // All songs have gone against each other
    throw new Error("All songs have been matched up");
}

export async function determineNextMatchup(): Promise<{
    song1: SongContender;
    song2: SongContender;
    album1: Album;
    album2: Album;
    song1Wins: number;
    song2Wins: number;
    nextBattleNumber: number;
    result?: Result;
    totalMatches: number;
}> {
    const { sorted, histories, numTies, previousBattlesRaw, result, fewestEliminations } = await calculateHistory();

    const { song1Id, song2Id } = findFirstUnmatchedSongs(sorted, previousBattlesRaw);

    const { song: song1, album: album1 } = fromSongId(song1Id);
    const { song: song2, album: album2 } = fromSongId(song2Id);

    // The total number of matches that will be played
    // For NUMBER_OF_ELIMINATIONS > 1, this is a lower bound.
    const totalMatches = NUMBER_OF_ELIMINATIONS * (histories.size - 1) + numTies + fewestEliminations;

    // The number of times the songs have gone before
    const song1Wins = histories.get(song1Id)?.rounds || 0;
    const song2Wins = histories.get(song2Id)?.rounds || 0;

    return { song1, song2, song1Wins, song2Wins, album1, album2, nextBattleNumber: previousBattlesRaw.length + 1, result, totalMatches };
}
