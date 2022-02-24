import {
    ActionRow,
    ApplicationCommandOptionType,
    ButtonComponent,
    ButtonStyle,
    Colors,
    Embed
} from "discord.js/packages/discord.js";
import fetch from "node-fetch";
import { CommandError } from "../../../Configuration/definitions";
import secrets from "../../../Configuration/secrets";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";
import { RecentTracksResponse } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Sets your lastfm username for use with other /fm commands",
    options: [
        {
            name: "username",
            description: "Your username on last.fm",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const fmUsername = ctx.opts.username;
    if (!fmUsername) {
        // prettier-ignore
        const instructions =  
            `**To set up your fm account:**

            \`1.\` Go to <https://www.last.fm/> and set up your fm account.

            \`2.\` Link your last.fm account to whatever music streaming service you use. For spotify, follow these instructions: <https://community.spotify.com/t5/Spotify-Answers/How-can-I-connect-Spotify-to-Last-fm/ta-p/4795301>.

            \`3.\` Use the \`/fm set\` command followed by your **fm username**, for example:
            \`\`\`fix
            /fm set nico
            \`\`\`

            \`4.\` The \`/fm now\` command should now work properly and display what you are currently listening to!`.replace(/^ +/gm,"");
        await ctx.send({
            embeds: [new Embed({ description: instructions, color: Colors.Red })]
        });
        return;
    }

    const existingUserItem = await prisma.userLastFM.findUnique({ where: { username: fmUsername } });

    if (existingUserItem) {
        if (existingUserItem.userId === ctx.user.id) {
            throw new CommandError("This is already your last.FM username!");
        }
        throw new CommandError(`Someone already connected the last.FM user \`${fmUsername}\``);
    }

    const lastTrack = await getMostRecentTrack(ctx.opts.username);
    const avatar = ctx.user.displayAvatarURL();

    let trackEmbed = new Embed()
        .setAuthor({ name: fmUsername, iconURL: avatar, url: `https://www.last.fm/user/${fmUsername}` })
        .setTitle(`You have not scrobbled any songs yet. Is this your profile?`)
        .setDescription(
            `Please ensure you are linking the correct profile by going here\n**-->** https://www.last.fm/user/${fmUsername}\n\nThis should link to **your** last.fm profile.`
        )
        .setFooter({ text: "Respond with yes or no" });

    if (lastTrack?.name) {
        trackEmbed = new Embed()
            .setAuthor({ name: fmUsername, iconURL: avatar, url: `https://www.last.fm/user/${fmUsername}` })
            .setTitle("This is your most recently scrobbled song. Does this look correct?")
            .addField({ name: "Track", value: lastTrack.name, inline: true })
            .addField({ name: "Artist", value: lastTrack.artist, inline: true })
            .addField({ name: "Album", value: lastTrack.album, inline: true })
            .addField({ name: "Time", value: lastTrack.date, inline: true })
            .setThumbnail(lastTrack.image)
            .setFooter({ text: "Press one of the buttons below to respond" });
    }

    const timedListener = new TimedInteractionListener(ctx, <const>["fmSetYesId", "fmSetNoId"]);
    const [yesId, noId] = timedListener.customIDs;

    const actionRow = new ActionRow().setComponents([
        new ButtonComponent().setLabel("Yes").setStyle(ButtonStyle.Success).setCustomId(yesId),
        new ButtonComponent().setLabel("No").setStyle(ButtonStyle.Danger).setCustomId(noId)
    ]);

    await ctx.send({ embeds: [trackEmbed], components: [actionRow] });

    const [buttonPressed] = await timedListener.wait();

    if (buttonPressed !== yesId) {
        const failEmbed = new Embed({ description: "Setting FM username cancelled." });
        await ctx.editReply({ embeds: [failEmbed], components: [] });
        return;
    }

    await prisma.userLastFM.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, username: fmUsername },
        update: { username: fmUsername }
    });

    await ctx.send({
        embeds: [new Embed({ description: `Succesfully updated your FM username to \`${fmUsername}\`` })],
        components: []
    });

    async function getMostRecentTrack(username: string) {
        try {
            const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&limit=1&api_key=${secrets.apis.lastfm}&format=json`;
            const response = (await (await fetch(url)).json()) as RecentTracksResponse;

            const info = response.recenttracks;
            return {
                album: info.track[0].album["#text"] || "No Album",
                artist: info.track[0].artist["#text"] || "No Artist",
                name: info.track[0].name || "No Track",
                image: info.track[0].image.pop()?.["#text"] || "",
                date: info.track[0].date ? "Played: " + info.track[0].date["#text"] : "Now playing"
            };
        } catch (e) {
            console.log(e, /SETFM_ERROR/);
            return null;
        }
    }
});

export default command;
