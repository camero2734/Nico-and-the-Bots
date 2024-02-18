import { GuildMember } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import secrets from "../../../Configuration/secrets";
import SimpleFM from '@solely/simple-fm';

// export type RankedAlbum = LastFMUserGetTopAlbumsResponse["topalbums"]["album"][number];

export const fm = new SimpleFM(secrets.apis.lastfm);

export class Album {
    artist: string;
    name: string;
    playcount: number;
    image: string;
    constructor(album: any) {
        this.artist = album.artist.name;
        this.name = album.name;
        this.playcount = +album.playcount;
        this.image = album.image[album.image.length - 1]["#text"];
    }
}

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
