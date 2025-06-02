import type { GuildMember } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import secrets from "../../../Configuration/secrets";
import SimpleFM from "@solely/simple-fm";

export type RankedAlbum = Awaited<
	ReturnType<SimpleFM["user"]["getTopAlbums"]>
>["albums"][number];

export const fm = new SimpleFM(secrets.apis.lastfm);

export class Album {
	artist: string;
	name?: string;
	playcount: number;
	image?: string;
	constructor(album: RankedAlbum) {
		this.artist = album.artist.name;
		this.name = album.name;
		this.playcount = +album.playCount;

		this.image =
			album.image?.at(-1)?.url ||
			"http://orig14.deviantart.net/5162/f/2014/153/9/e/no_album_art__no_cover___placeholder_picture_by_cmdrobot-d7kpm65.jpg";
	}
}

export const getFMUsername = async (
	username: string | undefined,
	mentionedId: string | undefined,
	usingMember: GuildMember,
): Promise<string> => {
	if (username) return username;

	const userId = mentionedId || usingMember.id;
	// Mentioned another user
	const fm = await prisma.userLastFM.findUnique({ where: { userId } });
	if (!fm) {
		const whose = mentionedId ? "The mentioned user's'" : "Your";
		throw new CommandError(`${whose} Last.FM username isn't connected!`);
	}
	return fm.username;
};
