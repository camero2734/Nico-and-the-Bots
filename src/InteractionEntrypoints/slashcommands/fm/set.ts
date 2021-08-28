import { CommandError } from "../../../Configuration/definitions";
import secrets from "../../../Configuration/secrets";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";
import { RecentTracksResponse } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Sets your lastfm username for use with other /fm commands",
    options: [{ name: "username", description: "Your username on last.fm", required: true, type: "STRING" }]
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
            embeds: [new MessageEmbed({ description: instructions, color: "RANDOM" })]
        });
        return;
    }

    const existingUserItem = await prisma.userLastFM.findUnique({ where: { username: fmUsername } });

    if (existingUserItem) throw new CommandError(`Someone already connected the last.FM user \`${fmUsername}\``);

    const lastTrack = await getMostRecentTrack(ctx.opts.username);
    const avatar = ctx.user.displayAvatarURL();

    let trackEmbed = new MessageEmbed()
        .setAuthor(fmUsername, avatar, `https://www.last.fm/user/${fmUsername}`)
        .setTitle(`You have not scrobbled any songs yet. Is this your profile?`)
        .setDescription(
            `Please ensure you are linking the correct profile by going here\n**-->** https://www.last.fm/user/${fmUsername}\n\nThis should link to **your** last.fm profile.`
        )
        .setFooter("Respond with yes or no");

    if (lastTrack?.name) {
        trackEmbed = new MessageEmbed()
            .setAuthor(fmUsername, avatar, `https://www.last.fm/user/${fmUsername}`)
            .setTitle("This is your most recently scrobbled song. Does this look correct?")
            .addField("Track", lastTrack.name, true)
            .addField("Artist", lastTrack.artist, true)
            .addField("Album", lastTrack.album, true)
            .addField("Time", lastTrack.date, true)
            .setThumbnail(lastTrack.image)
            .setFooter("Press one of the buttons below to respond");
    }

    const timedListener = new TimedInteractionListener(ctx, <const>["fmSetYesId", "fmSetNoId"]);
    const [yesId, noId] = timedListener.customIDs;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Yes", style: "SUCCESS", customId: yesId }),
        new MessageButton({ label: "No", style: "DANGER", customId: noId })
    ]);

    await ctx.send({ embeds: [trackEmbed], components: [actionRow] });

    const [buttonPressed] = await timedListener.wait();

    if (buttonPressed !== yesId) {
        const failEmbed = new MessageEmbed({ description: "Setting FM username cancelled." });
        await ctx.editReply({ embeds: [failEmbed], components: [] });
        return;
    }

    await prisma.userLastFM.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, username: fmUsername },
        update: { username: fmUsername }
    });

    await ctx.send({
        embeds: [new MessageEmbed({ description: `Succesfully updated your FM username to \`${fmUsername}\`` })],
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
