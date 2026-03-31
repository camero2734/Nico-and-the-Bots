import type { GuildMember } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import secrets from "../../../Configuration/secrets";
import { prisma } from "../../../Helpers/prisma-init";

import { LastFMAlbum, LastFMArtist, LastFMChart, LastFMLibrary, LastFMTag, LastFMTrack, LastFMUser } from 'lastfm-ts-api';

const album = new LastFMAlbum(secrets.apis.lastfm);
const artist = new LastFMArtist(secrets.apis.lastfm);
const chart = new LastFMChart(secrets.apis.lastfm);
const library = new LastFMLibrary(secrets.apis.lastfm);
const tag = new LastFMTag(secrets.apis.lastfm);
const track = new LastFMTrack(secrets.apis.lastfm);
const user = new LastFMUser(secrets.apis.lastfm);

export const fm = {
  album,
  artist,
  chart,
  library,
  tag,
  track,
  user,
};

export type RankedAlbum = Awaited<ReturnType<typeof fm.user.getTopAlbums>>["topalbums"]["album"][number];

export class Album {
  artist: string;
  name?: string;
  playcount: number;
  image?: string;
  constructor(album: RankedAlbum) {
    this.artist = album.artist.name;
    this.name = album.name;
    this.playcount = +album.playcount;

    this.image =
      album.image?.at(-1)?.["#text"] ||
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
