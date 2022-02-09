import secrets from "../../../Configuration/secrets";
import { GuildMember, ApplicationCommandOptionType } from "discord.js/packages/discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";

export class Album {
    artist: string;
    name: string;
    playcount: string;
    image: string;
    constructor(album: RankedAlbum) {
        this.artist = album.artist.name;
        this.name = album.name;
        this.playcount = album.playcount;
        this.image = album.image[album.image.length - 1]["#text"];
    }
}

export const createFMMethod = (username: string) => {
    const base = `http://ws.audioscrobbler.com/2.0/?`;
    const opts = new URLSearchParams({ username, api_key: secrets.apis.lastfm, format: "json" });
    return (options: { method: string; [k: string]: string }) => {
        for (const [key, value] of Object.entries(options)) {
            opts.append(key, value);
        }

        return `${base}${opts}`;
    };
};

export const getFMUsername = async (
    username: string | undefined,
    mentionedId: string | undefined,
    usingMember: GuildMember
): Promise<string> => {
    if (username) return username;

    const userId = mentionedId || usingMember.id;
    // Mentioned another user
    const fm = await prisma.userLastFM.findUnique({ where: { userId } });
    if (!fm) {
        const whose = mentionedId ? "The mentioned user's'" : "Your";
        throw new CommandError(`${whose} Last.FM username isn't connected!`);
    } else return fm.username;
};

interface TrackDate {
    uts: string;
    "#text": string;
}

interface FMIdentifier {
    mbid: string;
    "#text": string;
}

interface TrackImage {
    size: "small" | "medium" | "large" | "extralarge";
    "#text": string;
}

interface Track {
    artist: FMIdentifier;
    "@attr"?: { nowplaying: string };
    mbid: string;
    album: FMIdentifier;
    streamable: string;
    url: string;
    name: string;
    image: TrackImage[];
    date?: TrackDate;
}

interface RecentTracksAttr {
    page: string;
    total: string;
    user: string;
    perPage: string;
    totalPages: string;
}

interface RecentTracks {
    "@attr": RecentTracksAttr;
    track: Track[];
}

export interface RecentTracksResponse {
    recenttracks: RecentTracks;
}

interface FMPlayResponse {
    userplaycount: number;
    url: string;
}

export interface TrackResponse {
    track?: FMPlayResponse;
}

export interface AlbumResponse {
    album?: FMPlayResponse;
}

export interface ArtistResponse {
    artist?: {
        stats?: FMPlayResponse;
    };
}

export interface RankedArtist {
    url: string;
    name: string;
    mbid: string;
}
export interface RankedAlbum {
    artist: RankedArtist;
    image: TrackImage[];
    playcount: string;
    url: string;
    name: string;
    mbid: string;
}
