import { GuildMember } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { LastFMAlbum, LastFMArtist, LastFMTrack, LastFMUser, LastFMUserGetTopAlbumsResponse } from "lastfm-ts-api";
import secrets from "../../../Configuration/secrets";

export type RankedAlbum = LastFMUserGetTopAlbumsResponse["topalbums"]["album"][number];

export class Album {
    artist: string;
    name: string;
    playcount: number;
    image: string;
    constructor(album: RankedAlbum) {
        this.artist = album.artist.name;
        this.name = album.name;
        this.playcount = +album.playcount;
        this.image = album.image[album.image.length - 1]["#text"];
    }
}

export const lastFmUser = new LastFMUser(secrets.apis.lastfm);
export const lastFmTrack = new LastFMTrack(secrets.apis.lastfm);
export const lastFmArtist = new LastFMArtist(secrets.apis.lastfm);
export const lastFmAlbum = new LastFMAlbum(secrets.apis.lastfm);

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
