import { Canvas } from "@napi-rs/canvas";
import type { Poll, Vote } from "@prisma/client";
import {
  CategoryScale,
  Chart,
  type ChartItem,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
} from "chart.js";
import { setHours, startOfDay } from "date-fns";
import { ButtonStyle, type ColorResolvable } from "discord.js";
import { emojiIDs } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";

export const NUMBER_OF_ELIMINATIONS = 1;

Chart.defaults.font.family = "Futura";

Chart.register([CategoryScale, LineController, LineElement, LinearScale, PointElement, Legend]);

export enum AlbumName {
  SelfTitled = "Twenty One Pilots",
  RegionalAtBest = "Regional At Best",
  Vessel = "Vessel",
  Blurryface = "Blurryface",
  Trench = "Trench",
  ScaledAndIcy = "Scaled And Icy",
  Clancy = "Clancy",
  TOPxMM = "TOPxMM",
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
  emoji?: string;
  color?: ColorResolvable;
  /** YouTube video link */
  yt: string;
}

export const currentlyEnabledAlbum = AlbumName.SelfTitled;

export const IMAGE_SIZE = 1000;
export const PREFIX = `SongBattle2025AlbumBattle-${currentlyEnabledAlbum}-`;

const albumsRaw = [
  {
    name: AlbumName.SelfTitled,
    image: "https://i.scdn.co/image/ab67616d0000b2734f5687326079d90e731a10a6",
    color: "#8cb82c",
    emoji: emojiIDs.albums.selfTitled,
    songs: [
      { name: "Implicit Demand for Proof", yt: "https://youtu.be/hIlR7d7TzVg" },
      { name: "Fall Away", yt: "https://youtu.be/gxC5Dvqbcoc" },
      { name: "The Pantaloon", yt: "https://youtu.be/ycKEsJtlcEE" },
      { name: "Addict With a Pen", yt: "https://youtu.be/GILJrPA4r6M" },
      { name: "Friend, Please", yt: "https://youtu.be/QzL5Pp7z6BY" },
      { name: "March to the Sea", yt: "https://youtu.be/Bu9eqN8mrWw" },
      { name: "Johnny Boy", yt: "https://youtu.be/Z9ssOeR_c98" },
      { name: "Oh Ms Believer", yt: "https://youtu.be/NLauNXBr1Ls" },
      { name: "Air Catcher", yt: "https://youtu.be/IgTCkpPR4XA" },
      { name: "Trapdoor", yt: "https://youtu.be/Kqw1N5Buzl0" },
      { name: "A Car, a Torch, a Death", yt: "https://youtu.be/NWqQDINWg6A" },
      { name: "Taxi Cab", yt: "https://youtu.be/hq0fQLJ-658" },
      { name: "Before You Start Your Day", yt: "https://youtu.be/w8f7A_AtdVE" },
      { name: "Isle of Flightless Birds", yt: "https://youtu.be/RYvsTXbmxj4" },
    ],
  },
  {
    name: AlbumName.RegionalAtBest,
    image: "https://i.scdn.co/image/ab67616d0000b2739e09415e1975a4fae4389f1d",
    color: "#9bc1db",
    emoji: emojiIDs.albums.regionalAtBest,
    songs: [
      { name: "Guns for Hands", yt: "https://youtu.be/UVDjsd-wT7M" },
      { name: "Holding on to You", yt: "https://youtu.be/GMXsqXW5oas" },
      { name: "Ode to Sleep", yt: "https://youtu.be/bpycid3GVp8" },
      { name: "Slowtown", yt: "https://youtu.be/-2-gwRvrdnY" },
      { name: "Car Radio", yt: "https://youtu.be/fjclm1kCj9E" },
      { name: "Forest", yt: "https://youtu.be/-eFEu54W0To" },
      { name: "Glowing Eyes", yt: "https://youtu.be/dnCYRa3MBiY" },
      { name: "Kitchen Sink", yt: "https://youtu.be/_gcNBMMQIMk" },
      { name: "Anathema", yt: "https://youtu.be/NDoWoJPW7e0" },
      { name: "Lovely", yt: "https://youtu.be/2YGCoNfuRn4" },
      { name: "Ruby", yt: "https://youtu.be/VtjggQ7l-nk" },
      { name: "Trees", yt: "https://youtu.be/hlBz7U62t6s" },
      { name: "Be Concerned", yt: "https://youtu.be/wF_XsqEWmzo" },
      { name: "Clear", yt: "https://youtu.be/4_AOmYI2PqE" },
    ],
  },
  {
    name: AlbumName.Vessel,
    image: "https://i.scdn.co/image/ab67616d0000b273d263500f1f97e978daa5ceb1",
    color: "#aebfd9",
    emoji: emojiIDs.albums.vessel,
    songs: [
      { name: "Ode to Sleep", yt: "https://youtu.be/2OnO3UXFZdE" },
      { name: "Holding on to You", yt: "https://youtu.be/ktBMxkLUIwY" },
      { name: "Migraine", yt: "https://youtu.be/Bs92ejAGLdw" },
      { name: "House of Gold", yt: "https://youtu.be/mDyxykpYeu8" },
      { name: "Car Radio", yt: "https://youtu.be/92XVwY54h5k" },
      { name: "Semi-Automatic", yt: "https://youtu.be/pGb6KYJ3qpA" },
      { name: "Screen", yt: "https://youtu.be/NK7WWbXlkj4" },
      { name: "The Run and Go", yt: "https://youtu.be/wGbraQdkct8" },
      { name: "Fake You Out", yt: "https://youtu.be/KnthhE071-I" },
      { name: "Guns for Hands", yt: "https://youtu.be/Pmv8aQKO6k0" },
      { name: "Trees", yt: "https://youtu.be/szp9x1ZlZn4" },
      { name: "Truce", yt: "https://youtu.be/eCeBNwBUkcI" },
      // { name: "Lovely (Bonus Track Version)", yt: "https://youtu.be/GJZq6QXOY_s" },
    ],
  },
  // {
  //   name: AlbumName.Blurryface,
  //   image: "https://i.scdn.co/image/ab67616d00001e022df0d98a423025032d0db1f7",
  //   color: "#ec5748",
  //   emoji: emojiIDs.albums.blurryface,
  //   songs: [
  //     { name: "Heavydirtysoul", yt: "https://youtu.be/r_9Kf0D5BTs" },
  //     { name: "Stressed Out", yt: "https://youtu.be/pXRviuL6vMY" },
  //     { name: "Ride", yt: "https://youtu.be/Pw-0pbY9JeU" },
  //     { name: "Fairly Local", yt: "https://youtu.be/HDI9inno86U" },
  //     { name: "Tear in My Heart", yt: "https://youtu.be/nky4me4NP70" },
  //     { name: "Lane Boy", yt: "https://youtu.be/ywvRgGAd2XI" },
  //     { name: "The Judge", yt: "https://youtu.be/PbP-aIe51Ek" },
  //     { name: "Doubt", yt: "https://youtu.be/MEiVnNNpJLA" },
  //     { name: "Polarize", yt: "https://youtu.be/MiPBQJq49xk" },
  //     {
  //       name: "We Don't Believe What's on TV",
  //       yt: "https://youtu.be/zZEumf7RowI",
  //     },
  //     { name: "Message Man", yt: "https://youtu.be/iE_54CU7Fxk" },
  //     { name: "Hometown", yt: "https://youtu.be/pJtlLzsDICo" },
  //     { name: "Not Today", yt: "https://youtu.be/yqem6k_3pZ8" },
  //     { name: "Goner", yt: "https://youtu.be/3J5mE-J1WLk" },
  //   ],
  // },
  // {
  //   name: AlbumName.TOPxMM,
  //   image: "https://i.scdn.co/image/ab67616d00001e02aa53cf116c616b262b59742a",
  //   color: "#D9C6B0",
  //   emoji: emojiIDs.albums.topxmm,
  //   songs: [
  //     { name: "Heathens (feat. MUTEMATH)", yt: "https://youtu.be/qNk-xjCISYQ" },
  //     {
  //       name: "Heavydirtysoul (feat. MUTEMATH)",
  //       yt: "https://youtu.be/0KEwQEBEvIU",
  //     },
  //     { name: "Ride (feat. MUTEMATH)", yt: "https://youtu.be/fo4p5GJDk_g" },
  //     {
  //       name: "Tear in My Heart (feat. MUTEMATH)",
  //       yt: "https://youtu.be/dnrcpLRykO0",
  //     },
  //     { name: "Lane Boy (feat. MUTEMATH)", yt: "https://youtu.be/oRb0C1rMCH0" },
  //   ],
  // },
  {
    name: AlbumName.Trench,
    image: "https://i.scdn.co/image/ab67616d00001e027a1bbe4ec7066c9db1d0f398",
    color: "#fce300",
    emoji: emojiIDs.albums.trench,
    songs: [
      { name: "Jumpsuit", yt: "https://youtu.be/UOUBW8bkjQ4" },
      { name: "Levitate", yt: "https://youtu.be/uv_1AKKKJnk" },
      { name: "Morph", yt: "https://youtu.be/OmL9TqTFIAc" },
      { name: "My Blood", yt: "https://youtu.be/8mn-FFjIbo8" },
      { name: "Chlorine", yt: "https://youtu.be/eJnQBXmZ7Ek" },
      { name: "Smithereens", yt: "https://youtu.be/v8GwUos_Mtw" },
      { name: "Neon Gravestones", yt: "https://youtu.be/5MeQ9rA2Ifg" },
      { name: "The Hype", yt: "https://youtu.be/Io2hbcrAYBw" },
      { name: "Nico and the Niners", yt: "https://youtu.be/hMAPyGoqQVw" },
      { name: "Cut My Lip", yt: "https://youtu.be/iRwXUzHpHIc" },
      { name: "Bandito", yt: "https://youtu.be/VQHTROo0S8E" },
      { name: "Pet Cheetah", yt: "https://youtu.be/VGMmSOsNAdc" },
      { name: "Legend", yt: "https://youtu.be/f3bzqzspXPI" },
      { name: "Leave the City", yt: "https://youtu.be/zDktApy8Sn0" },
    ],
  },
  {
    name: AlbumName.ScaledAndIcy,
    image: "https://i.scdn.co/image/ab67616d00001e02239ee8e0c619611d8beef008",
    color: "#01dead",
    emoji: emojiIDs.albums.scaledAndIcy,
    songs: [
      { name: "Good Day", yt: "https://youtu.be/uSnpObUx71Q" },
      { name: "Choker", yt: "https://youtu.be/2sBRnnnZyFw" },
      { name: "Shy Away", yt: "https://youtu.be/niR2qJ3mGEE" },
      { name: "The Outside", yt: "https://youtu.be/eNcvblM8-_o" },
      { name: "Saturday", yt: "https://youtu.be/FiXVRdotCEk" },
      { name: "Never Take It", yt: "https://youtu.be/h3qm1wwkZ48" },
      { name: "Mulberry Street", yt: "https://youtu.be/uBcWM0sXdgk" },
      { name: "Formidable", yt: "https://youtu.be/jek7Wy2VA2s" },
      { name: "Bounce Man", yt: "https://youtu.be/MAZo87a-Wqo" },
      { name: "No Chances", yt: "https://youtu.be/8_tMRvpzDVc" },
      { name: "Redecorate", yt: "https://youtu.be/6_GCsQRS3kM" },
    ],
  },
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
    ],
  },
  {
    name: AlbumName.Singles,
    color: "#FFFFFF",
    emoji: emojiIDs.albums.clancy,
    songs: [
      {
        name: "Level of Concern",
        image: "https://i.scdn.co/image/ab67616d00001e02ab2f8973949159695f65df7b",
        yt: "https://youtu.be/loOWKm8GW6A",
      },
      {
        name: "The Craving (single version)",
        image: "https://i.scdn.co/image/ab67616d00001e02d1e9c8027e794228dc35ad26",
        yt: "https://youtu.be/H3OiQEOcrA8",
      },
      {
        name: "Heathens",
        image: "https://i.scdn.co/image/ab67616d00001e022ca3ba8f334ca5a5f0312efb",
        yt: "https://youtu.be/UprcpdwuwCg",
        emoji: emojiIDs.albums.heathensSingle,
        color: "#BBF2AC",
      },
      {
        name: "Doubt (demo)",
        image: "https://i.scdn.co/image/ab67616d00001e029b0aa15c3f5e17fa8281aec7",
        yt: "https://youtu.be/7s1033v2DTQ",
        emoji: emojiIDs.albums.doubtSingle,
        color: "#252525",
      },
      {
        name: "The Line",
        image: "https://i.scdn.co/image/ab67616d00001e028a577010b0baa62c836e330b",
        yt: "https://youtu.be/E2Rj2gQAyPA",
        emoji: emojiIDs.albums.doubtSingle,
        color: "#252525",
      },
      {
        name: "Time to Say Goodbye",
        image: "https://i1.sndcdn.com/artworks-000005083596-vd83l9-t500x500.jpg",
        yt: "https://youtu.be/BzUCuln5QX8",
      },
      {
        name: "Christmas Saves the Year",
        image: "https://i.scdn.co/image/ab67616d00001e02fdd772158c3af54caf44879b",
        yt: "https://youtu.be/ByK84WFMaJw",
      },
      // { name: "Twenty-Four (Switchfoot Cover)", image: "https://i.scdn.co/image/ab67616d00001e0243882fdb47a06d880f61efdc", yt: "https://youtu.be/Ywc58_UBgZo" },
      // {
      //   name: "Cancer (MCR Cover)",
      //   image: "https://i.scdn.co/image/ab67616d00001e020fde79bfa5e23cb9cbdcd142",
      //   yt: "https://youtu.be/yw6i1SAHetc",
      //   emoji: emojiIDs.albums.cancerCover,
      //   color: "#FFFFFF",
      // },
    ],
  },
] satisfies Album[];

export const albums = albumsRaw.filter((a) => a.name === currentlyEnabledAlbum);

export const embedFooter = (totalVotes: number, endsAt: Date) =>
  `${totalVotes} vote${F.plural(totalVotes)} | Votes are anonymous | Voting ends ${F.discordTimestamp(endsAt, "relative")}`;

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

export function fromSongId(id: string): { song: SongContender; album: Album } {
  const [songName, albumName] = id.split(DELIMITER);
  const songs = albums.flatMap((a) => a.songs.map((s) => ({ ...s, album: a })));
  const song = songs.find((s) => s.name === songName && s.album.name === albumName);

  if (!song) throw new CommandError(`Song not found: ${songName} in album ${albumName}`);

  return { song, album: song.album };
}

export interface SongBattleHistory {
  rounds: number;
  eliminations: number;
}

export enum Result {
  Song1 = 0,
  Song2 = 1,
  Tie = 2,
}

export async function calculateHistory() {
  const previousBattlesRaw = await prisma.poll.findMany({
    where: {
      name: { startsWith: PREFIX },
    },
    include: { votes: true },
    orderBy: { id: "asc" },
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
    const song1Votes = battle.votes.filter((v) => v.choices[0] === 0).length;
    const song2Votes = totalVotes - song1Votes;

    const song1 = histories.get(battle.options[0]);
    const song2 = histories.get(battle.options[1]);

    if (!song1 || !song2)
      throw new CommandError(`Song not found in history: ${battle.options[0]} or ${battle.options[1]}`);

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

  const fewestEliminations = Math.min(...sorted.map((s) => s[1].eliminations));

  return {
    histories,
    sorted,
    numTies,
    previousBattlesRaw,
    result,
    fewestEliminations,
  };
}

export function determineResult(poll: Poll & { votes: Vote[] }): Result {
  const totalVotes = poll.votes.length;
  const song1Votes = poll.votes.filter((v) => v.choices[0] === 0).length;
  const song2Votes = totalVotes - song1Votes;

  if (song1Votes > song2Votes) {
    return Result.Song1;
  }
  if (song2Votes > song1Votes) {
    return Result.Song2;
  }
  return Result.Tie;
}

export function findFirstUnmatchedSongs(sorted: [string, SongBattleHistory][], previousBattlesRaw: Poll[]) {
  let maximumRound1 = Number.POSITIVE_INFINITY;
  let maximumRound2 = Number.POSITIVE_INFINITY;
  let finalSong1Id: string | undefined;
  let finalSong2Id: string | undefined;

  // Find the first two songs that haven't been matched up yet
  for (const [song1Id, history] of sorted) {
    // This song is in a higher bracket than an earlier found match, no need to continue
    if (history.rounds > maximumRound1) break;

    const previousBattles = previousBattlesRaw.filter((b) => b.options.includes(song1Id));

    for (const [song2Id, history2] of sorted) {
      // We've already found a better match
      if (history2.rounds >= maximumRound2) break;
      // Can't match a song against itself
      if (song1Id === song2Id) continue;
      // This song has already gone against song1
      if (previousBattles.some((b) => b.options.includes(song2Id))) continue;

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

// The total number of matches that will be played
// For NUMBER_OF_ELIMINATIONS > 1, this is a lower bound.
export function getTotalMatches(history: Awaited<ReturnType<typeof calculateHistory>>) {
  const { histories, numTies, fewestEliminations } = history;
  return NUMBER_OF_ELIMINATIONS * (histories.size - 1) + numTies + fewestEliminations;
}

export function determineNextMatchup(history: Awaited<ReturnType<typeof calculateHistory>>): {
  song1: SongContender;
  song2: SongContender;
  album1: Album;
  album2: Album;
  song1Wins: number;
  song2Wins: number;
  song1Losses: number;
  song2Losses: number;
  nextBattleNumber: number;
  result?: Result;
  totalMatches: number;
} {
  const { sorted, histories, previousBattlesRaw, result } = history;
  const totalMatches = getTotalMatches(history);

  const { song1Id, song2Id } = findFirstUnmatchedSongs(sorted, previousBattlesRaw);

  const { song: song1, album: album1 } = fromSongId(song1Id);
  const { song: song2, album: album2 } = fromSongId(song2Id);

  // The number of times the songs have gone before
  const song1Hist = histories.get(song1Id);
  const song2Hist = histories.get(song2Id);

  const song1Wins = song1Hist ? song1Hist.rounds - song1Hist.eliminations : 0;
  const song2Wins = song2Hist ? song2Hist.rounds - song2Hist.eliminations : 0;

  const song1Losses = song1Hist ? song1Hist.eliminations : 0;
  const song2Losses = song2Hist ? song2Hist.eliminations : 0;

  return {
    song1,
    song2,
    song1Wins,
    song2Wins,
    song1Losses,
    song2Losses,
    album1,
    album2,
    nextBattleNumber: previousBattlesRaw.length + 1,
    result,
    totalMatches,
  };
}

const MINUTES_PER_BUCKET = 5;
const bucketsPerHour = 60 / MINUTES_PER_BUCKET;
const totalBuckets = 24 * bucketsPerHour;
export async function createResultsChart(pollId: number) {
  const poll = await prisma.poll.findFirst({
    where: {
      id: pollId,
    },
    include: {
      votes: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!poll) {
    throw new Error("Poll not found");
  }

  const firstVote = poll.votes[0].createdAt;
  const chartStart = setHours(startOfDay(firstVote), 15);

  const labels: string[] = [];
  const voteCounts0: number[] = [];
  const voteCounts1: number[] = [];
  for (let i = 0; i < totalBuckets; i++) {
    const hour = (i / bucketsPerHour).toFixed(1);
    labels.push(hour);
    voteCounts0.push(0);
    voteCounts1.push(0);
  }

  for (const vote of poll.votes) {
    const voteTime = vote.createdAt;
    const diffMinutes = (voteTime.getTime() - chartStart.getTime()) / (1000 * 60);
    const bucketIndex = Math.floor(diffMinutes / MINUTES_PER_BUCKET);

    if (bucketIndex >= 0 && bucketIndex < totalBuckets) {
      if (vote.choices[0] === 0) {
        voteCounts0[bucketIndex]++;
      } else if (vote.choices[0] === 1) {
        voteCounts1[bucketIndex]++;
      }
    }
  }

  // Optionally, make the Y axis cumulative for each choice
  let cumulative0 = 0;
  let cumulative1 = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  const cumulativeCounts0 = voteCounts0.map((count) => (cumulative0 += count));
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  const cumulativeCounts1 = voteCounts1.map((count) => (cumulative1 += count));

  const song1 = fromSongId(poll.options[0]);
  const song2 = fromSongId(poll.options[1]);

  const song1Wins = cumulative0 > cumulative1;

  const canvas = new Canvas(1000, 500);
  const chart = new Chart(canvas as unknown as ChartItem, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${song1.song.name} (${song1.album.name})`,
          data: cumulativeCounts0,
          borderColor: song1Wins ? "#df2a2a" : "#eaeaea",
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: `${song2.song.name} (${song2.album.name})`,
          data: cumulativeCounts1,
          borderColor: song1Wins ? "#eaeaea" : "#df2a2a",
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: "Hours Elapsed",
          },
          ticks: {
            // Display fewer ticks for readability when many data points
            callback: (_, index) => {
              // Only show whole hour labels
              const hourValue = Number.parseFloat(labels[index]);
              return Number.isInteger(hourValue) ? hourValue.toString() : "";
            },
            autoSkip: true,
            maxTicksLimit: 25,
          },
        },
        y: {
          title: {
            display: true,
            text: "# of Votes",
          },
          beginAtZero: true,
        },
      },
    },
  });

  const buffer = canvas.toBuffer("image/png");
  chart.destroy();
  return buffer;
}
