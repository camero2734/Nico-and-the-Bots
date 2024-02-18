import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { emojiIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { GeniusClient } from "../../../Helpers/apis/genius";
import { SpotifyClient } from "../../../Helpers/apis/spotify";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import {
    getFMUsername,
    fm
} from "./_consts";
import { format } from "date-fns";

const command = new SlashCommand(<const>{
    description: "Displays now playing on last.fm",
    options: [
        {
            name: "user",
            description: "The user in the server to lookup",
            required: false,
            type: ApplicationCommandOptionType.User
        },
        {
            name: "username",
            description: "The Last.FM username to lookup",
            required: false,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();
    const selfFM = !ctx.opts.username && !ctx.opts.user;
    const username = await getFMUsername(ctx.opts.username, ctx.opts.user, ctx.member);

    const recentRes = await fm.user.getRecentTracks({ username, limit: 1 });

    const tracks = recentRes.tracks;
    const total = recentRes.search.totalResults;

    if (!total) {
        throw new CommandError(`Unable to get your recent tracks. Are you sure your username ${username} is correct?`);
    }

    const track = {
        album: tracks[0].album.name,
        artist: tracks[0].artist?.name,
        name: tracks[0].name,
        image: tracks[0].image?.find((i) => i.size === "small")?.url,
        date: tracks[0].dateAdded ? "Played: " + format(tracks[0].dateAdded, "dd MMM yyyy, HH:mm") : "Now playing"
    };

    const [trackRes, artistRes, albumRes] = await Promise.allSettled([
        fm.track.getInfo({ track: track.name, artist: track.artist!, username: username }),
        fm.artist.getInfo({ artist: track.artist!, username: username }),
        fm.album.getInfo({ album: track.album!, artist: track.artist!, username: username })
    ]);
    const trackPlay = trackRes.status === "fulfilled" ? trackRes.value : null;
    const artistPlay = artistRes.status === "fulfilled" ? artistRes.value : null;
    const albumPlay = albumRes.status === "fulfilled" ? albumRes.value : null;

    function us_pl(us_in: string) {
        //  In: https://www.last.fm/music/Starset/_/TELEKINETIC
        // Out: https://www.last.fm/user/pootusmaximus/library/music/Starset/_/TELEKINETIC
        return us_in.replace("last.fm/music", `last.fm/user/${username}/library/music`);
    }

    const trackName = track.name || "No Title";
    const trackCount = trackPlay?.userStats.userPlayCount || 0;
    const trackURL = trackPlay?.url || "https://www.last.fm";
    const trackField = `${trackName}\n[${trackCount} play${+trackCount === 1 ? "" : "s"}](${us_pl(trackURL)})`;

    const albumName = track.album || "No Album";
    const albumCount = albumPlay?.userStats?.userPlayCount || 0;
    const albumURL = albumPlay?.url || "https://www.last.fm";
    const albumField = `${albumName}\n[${albumCount} play${+albumCount === 1 ? "" : "s"}](${us_pl(albumURL)})`;

    const artistName = track.artist || "No Artist";
    const artistCount = artistPlay?.userStats.userPlayCount || 0;
    const artistURL = artistPlay?.url || "https://www.last.fm";
    const artistField = `${artistName}\n[${artistCount} play${+artistCount === 1 ? "" : "s"}](${us_pl(artistURL)})`;

    const thumbnail =
        track.image?.replace("/34s/", "/300x300/") ||
        "http://orig14.deviantart.net/5162/f/2014/153/9/e/no_album_art__no_cover___placeholder_picture_by_cmdrobot-d7kpm65.jpg";

    console.log(thumbnail);

    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`${username}'s FM`)
        .addFields([{ name: "Track", value: trackField, inline: true }])
        .addFields([{ name: "Album", value: albumField, inline: true }])
        .addFields([{ name: "Artist", value: artistField, inline: true }])
        .setThumbnail(thumbnail)
        .setFooter({ text: track.date })
        .setAuthor({
            name: `${total} total scrobbles`,
            iconURL: "http://icons.iconarchive.com/icons/sicons/flat-shadow-social/512/lastfm-icon.png",
            url: `https://www.last.fm/user/${username}`
        });

    const starActionRow = new ActionRowBuilder<ButtonBuilder>();

    // Add star button if own FM
    if (selfFM) {
        const starButton = new ButtonBuilder()
            .setLabel("0")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji({ name: "⭐" })
            .setCustomId(genStarId({ fmStarId: "" }));
        starActionRow.addComponents([starButton]);
    }

    // Get Spotify and Genius links
    const spotifyResults = await SpotifyClient.searchTracks(`track:${trackName} artist:${artistName}`, {
        limit: 1
    }).catch(() => null);
    const trackUrl = spotifyResults?.body.tracks?.items?.[0]?.external_urls.spotify;
    if (trackUrl) {
        const spotifyButton = new ButtonBuilder()
            .setEmoji({ id: emojiIDs.spotify })
            .setLabel("Listen")
            .setStyle(ButtonStyle.Link)
            .setURL(trackUrl);
        starActionRow.addComponents([spotifyButton]);
    }

    const geniusResult = await GeniusClient.getSong([trackName, artistName].join(" "));
    if (geniusResult) {
        const geniusButton = new ButtonBuilder()
            .setEmoji({ id: emojiIDs.genius })
            .setLabel("Lyrics")
            .setStyle(ButtonStyle.Link)
            .setURL(geniusResult.result.url);
        starActionRow.addComponents([geniusButton]);
    }

    await ctx.editReply({ embeds: [embed], components: [starActionRow] });
});

const genStarId = command.addInteractionListener("fmStarInt", <const>["fmStarId"], async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    await ctx.editReply({ content: "This feature is coming in a future update" });
});

export default command;
