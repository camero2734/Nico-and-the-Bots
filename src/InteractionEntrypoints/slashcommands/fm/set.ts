import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";
import { fm } from "./_consts";

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

            \`4.\` The \`/fm now\` command should now work properly and display what you are currently listening to!`.replace(/^ +/gm, "");
        await ctx.send({
            embeds: [new EmbedBuilder({ description: instructions, color: Colors.Red })]
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

    let trackEmbed = new EmbedBuilder()
        .setAuthor({ name: fmUsername, iconURL: avatar, url: `https://www.last.fm/user/${fmUsername}` })
        .setTitle(`You have not scrobbled any songs yet. Is this your profile?`)
        .setDescription(
            `Please ensure you are linking the correct profile by going here\n**-->** https://www.last.fm/user/${fmUsername}\n\nThis should link to **your** last.fm profile.`
        )
        .setFooter({ text: "Respond with yes or no" });

    if (lastTrack?.name) {
        trackEmbed = new EmbedBuilder()
            .setAuthor({ name: fmUsername, iconURL: avatar, url: `https://www.last.fm/user/${fmUsername}` })
            .setTitle("This is your most recently scrobbled song. Does this look correct?")
            .addFields([{ name: "Track", value: lastTrack.name, inline: true }])
            .addFields([{ name: "Artist", value: lastTrack.artist, inline: true }])
            .addFields([{ name: "Album", value: lastTrack.album, inline: true }])
            .addFields([{ name: "Time", value: lastTrack.date, inline: true }])
            .setThumbnail(lastTrack.image)
            .setFooter({ text: "Press one of the buttons below to respond" });
    }

    const timedListener = new TimedInteractionListener(ctx, <const>["fmSetYesId", "fmSetNoId"]);
    const [yesId, noId] = timedListener.customIDs;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder().setLabel("Yes").setStyle(ButtonStyle.Success).setCustomId(yesId),
        new ButtonBuilder().setLabel("No").setStyle(ButtonStyle.Danger).setCustomId(noId)
    ]);

    await ctx.send({ embeds: [trackEmbed], components: [actionRow] });

    const [buttonPressed] = await timedListener.wait();

    if (buttonPressed !== yesId) {
        const failEmbed = new EmbedBuilder({ description: "Setting FM username cancelled." });
        await ctx.editReply({ embeds: [failEmbed], components: [] });
        return;
    }

    await prisma.userLastFM.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, username: fmUsername },
        update: { username: fmUsername }
    });

    await ctx.send({
        embeds: [new EmbedBuilder({ description: `Succesfully updated your FM username to \`${fmUsername}\`` })],
        components: []
    });

    async function getMostRecentTrack(username: string) {
        const res = await fm.user.getRecentTracks({ username, limit: 1 });

        return {
            album: res.tracks[0].album.name || "No Album",
            artist: res.tracks[0].artist?.name || "No Artist",
            name: res.tracks[0].name || "No Track",
            image: res.tracks[0].image?.pop()?.url || "",
            date: res.tracks[0].dateAdded ? "Played: " + res.tracks[0].dateAdded : "Now playing"
        };
    }
});

export default command;
