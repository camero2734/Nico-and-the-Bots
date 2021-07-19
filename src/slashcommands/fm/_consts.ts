import * as secrets from "configuration/secrets.json";

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
