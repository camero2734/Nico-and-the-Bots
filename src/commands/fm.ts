import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { MessageTools } from "helpers";
import { Connection, MoreThan } from "typeorm";
import fetch from "node-fetch";
import * as secrets from "configuration/secrets.json";
import { MessageEmbed } from "discord.js";
import { FM } from "database/entities/FM";

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

interface TrackResponse {
    track?: FMPlayResponse;
}

interface AlbumResponse {
    album?: FMPlayResponse;
}

interface ArtistResponse {
    artist?: {
        stats?: FMPlayResponse;
    };
}

const createFMMethod = (username: string) => {
    const base = `http://ws.audioscrobbler.com/2.0/?`;
    const opts = new URLSearchParams({ username, api_key: secrets.apis.lastfm, format: "json" });
    return (options: { method: string; [k: string]: string }) => {
        for (const [key, value] of Object.entries(options)) {
            opts.append(key, value);
        }

        return `${base}${opts}`;
    };
};

export default new Command({
    name: "fm",
    description: "Displays a user's current scrobble",
    category: "Social",
    usage: "!fm (@ user | last.fm username)",
    example: "!fm",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        // DETERMINE INPUT TYPE
        let username: string | null = null;
        let selfFM = false;

        // MENTION
        const mention = MessageTools.getMentionedUser(msg);
        if (mention) {
            const mentionedItem = await connection.getRepository(Item).findOne({ id: mention.id, type: "FM" });
            if (!mentionedItem) throw new CommandError("The mentioned user does not have their FM set up!");
            else username = mentionedItem.title;
        }
        // USERNAME
        else if (msg.args.length > 0) {
            username = msg.argsString;
        }
        // OWN
        else {
            const userItem = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "FM" });
            if (!userItem) throw new CommandError("Your FM is not set up! Use `!setfm` to set it up.");
            else username = userItem.title;
            selfFM = true;
        }

        const getFMURL = createFMMethod(username);

        const url = getFMURL({ method: "user.getrecenttracks" });
        const response = (await (await fetch(url)).json()) as RecentTracksResponse;

        const info = response.recenttracks;
        const total = info["@attr"].total;

        const track = {
            album: info.track[0].album["#text"],
            artist: info.track[0].artist["#text"],
            name: info.track[0].name,
            image: info.track[0].image.find((i) => i.size === "small")?.["#text"],
            date: info.track[0].date ? "Played: " + info.track[0].date["#text"] : "Now playing"
        };

        const trackRequest = getFMURL({ method: "track.getInfo", track: track.name, artist: track.artist });
        const artistRequest = getFMURL({ method: "artist.getInfo", track: track.name, artist: track.artist });
        const albumRequest = getFMURL({ method: "album.getInfo", album: track.album, artist: track.artist });

        let trackPlay: TrackResponse | null = null;
        let artistPlay: ArtistResponse | null = null;
        let albumPlay: AlbumResponse | null = null;

        try {
            trackPlay = await (await fetch(trackRequest)).json();
            artistPlay = await (await fetch(artistRequest)).json();
            albumPlay = await (await fetch(albumRequest)).json();
        } catch (e) {
            console.log(e, /ERROR/);
        }

        function us_pl(us_in: string) {
            //  In: https://www.last.fm/music/Starset/_/TELEKINETIC
            // Out: https://www.last.fm/user/pootusmaximus/library/music/Starset/_/TELEKINETIC
            return us_in.replace("last.fm/music", `last.fm/user/${username}/library/music`);
        }

        const trackName = track.name || "No Title";
        const trackCount = trackPlay?.track?.userplaycount || 0;
        const trackURL = trackPlay?.track?.url || "https://www.last.fm";
        const trackField = `${trackName}\n[${trackCount} play${trackCount === 1 ? "" : "s"}](${us_pl(trackURL)})`;

        const albumName = track.album || "No Album";
        const albumCount = albumPlay?.album?.userplaycount;
        const albumURL = albumPlay?.album?.url || "https://www.last.fm";
        const albumField = `${albumName}\n[${albumCount} play${albumCount === 1 ? "" : "s"}](${us_pl(albumURL)})`;

        const artistName = track.artist || "No Artist";
        const artistCount = artistPlay?.artist?.stats?.userplaycount || 0;
        const artistURL = artistPlay?.artist?.stats?.url || "https://www.last.fm";
        const artistField = `${artistName}\n[${artistCount} play${artistCount === 1 ? "" : "s"}](${us_pl(artistURL)})`;

        const thumbnail =
            track.image ||
            "http://orig14.deviantart.net/5162/f/2014/153/9/e/no_album_art__no_cover___placeholder_picture_by_cmdrobot-d7kpm65.jpg";

        const embed = new MessageEmbed().setColor(msg.member.displayHexColor);
        embed.setTitle(`${username}'s FM`);
        embed.addField("Track", trackField, true);
        embed.addField("Album", albumField, true);
        embed.addField("Artist", artistField, true);
        embed.setThumbnail(thumbnail);

        embed.setFooter(track.date);
        embed.setAuthor(
            `${total} total scrobbles`,
            "http://icons.iconarchive.com/icons/sicons/flat-shadow-social/512/lastfm-icon.png",
            `https://www.last.fm/user/${username}`
        );
        const fm_m = await msg.channel.send(embed);

        if (!selfFM) return;

        // Don't react if recently scrobbled same song
        const TIME_LIMIT = 10; // Minutes
        const recentlyScrobbled = await connection.getRepository(FM).find({
            id: msg.author.id,
            track: track.name,
            album: track.album,
            artist: track.artist,
            time: MoreThan(Date.now() - TIME_LIMIT * 60 * 1000)
        });
        if (recentlyScrobbled && recentlyScrobbled.length > 0) return;

        // React and save to database
        await fm_m.react("⭐");
        const fm_item = new FM({
            id: msg.author.id,
            message_id: fm_m.id,
            track: track.name,
            album: track.album,
            artist: track.artist,
            stars: 0
        });
        await connection.manager.save(fm_item);
    }
});
