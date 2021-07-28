import { CommandError } from "configuration/definitions";
import { FM } from "database/entities/FM";
import { MessageActionRow, MessageButton, MessageEmbed, Snowflake } from "discord.js";
import fetch from "node-fetch";
import { emojiIDs } from "../../configuration/config";
import { GeniusClient } from "../../helpers/apis/genius";
import { SpotifyClient } from "../../helpers/apis/spotify";
import { prisma } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";
import { AlbumResponse, ArtistResponse, createFMMethod, RecentTracksResponse, TrackResponse } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Displays now playing on last.fm",
    options: [
        { name: "user", description: "The user in the server to lookup", required: false, type: "USER" },
        { name: "username", description: "The Last.FM username to lookup", required: false, type: "STRING" }
    ]
});

command.setHandler(async (ctx) => {
    const selfFM = !ctx.opts.username && !ctx.opts.user;
    const username = await (async (): Promise<string> => {
        if (ctx.opts.username) {
            // A specific username
            return ctx.opts.username;
        } else {
            const userId = ctx.opts.user || ctx.user.id;

            // Mentioned another user
            const fm = await prisma.userLastFM.findUnique({ where: { userId } });
            if (!fm) {
                const whose = ctx.opts.user ? "The mentioned user's'" : "Your";
                throw new CommandError(`${whose} Last.FM username isn't connected!`);
            } else return fm.username;
        }
    })();

    const getFMURL = createFMMethod(username);

    const url = getFMURL({ method: "user.getrecenttracks" });
    const response = (await (await fetch(url)).json()) as RecentTracksResponse;

    const info = response.recenttracks;
    const total = info?.["@attr"].total;

    if (!total) {
        throw new CommandError(`Unable to get your recent tracks. Are you sure your username ${username} is correct?`);
    }

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

    const embed = new MessageEmbed().setColor("RANDOM");
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

    const starActionRow = new MessageActionRow().addComponents([
        new MessageButton({ emoji: "⭐", label: "0", style: "SECONDARY", customId: "#&$_TBD" })
    ]);

    // Get Spotify and Genius links
    const spotifyResults = await SpotifyClient.searchTracks(`track:${trackName} artist:${artistName}`, { limit: 1 });
    const trackUrl = spotifyResults.body.tracks?.items?.[0]?.external_urls.spotify;
    if (trackUrl) {
        const spotifyButton = new MessageButton({
            emoji: emojiIDs.spotify,
            label: "Listen",
            style: "LINK",
            url: trackUrl
        });
        starActionRow.addComponents(spotifyButton);
    }

    const geniusResult = await GeniusClient.getSong([trackName, artistName].join(" "));
    if (geniusResult) {
        const geniusButton = new MessageButton({
            emoji: emojiIDs.genius,
            label: "Lyrics",
            style: "LINK",
            url: geniusResult.result.url
        });
        starActionRow.addComponents(geniusButton);
    }

    await ctx.send({ embeds: [embed], components: [starActionRow] });

    // if (!selfFM || typeof embed_res === "boolean") return;
    // const fm_m = await ctx.channel.messages.fetch(embed_res.id as Snowflake);

    // Don't react if recently scrobbled same song
    // const TIME_LIMIT = 10; // Minutes
    // const recentlyScrobbled = await connection.getRepository(FM).find({
    //     userid: ctx.user.id,
    //     track: track.name,
    //     album: track.album,
    //     artist: track.artist,
    //     time: MoreThan(Date.now() - TIME_LIMIT * 60 * 1000)
    // });
    // if (recentlyScrobbled && recentlyScrobbled.length > 0) return;

    // React and save to database
    // await fm_m.react(FM_REACT);
    // const fm_item = new FM({
    //     userid: ctx.user.id,
    //     message_id: fm_m.id,
    //     track: track.name,
    //     album: track.album,
    //     artist: track.artist,
    //     stars: 0
    // });
    // await connection.manager.save(fm_item);
});

export default command;
