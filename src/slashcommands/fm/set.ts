import { CommandOptionType } from "slash-create";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Message, MessageEmbed, TextChannel } from "discord.js";
import { Item } from "database/entities/Item";
import { MessageTools } from "helpers";
import * as secrets from "configuration/secrets.json";
import fetch from "node-fetch";
import { RecentTracksResponse } from "./now";

export const Options: CommandOptions = {
    description: "Sets your lastfm username for use with other /fm commands",
    options: [
        { name: "username", description: "Your username on last.fm", required: true, type: CommandOptionType.STRING }
    ]
};

export const Executor: CommandRunner<{ username: string }> = async (ctx) => {
    const options = ctx.opts;
    const { client, connection } = ctx;

    if (!options.username) {
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
        await ctx.embed(new MessageEmbed({ description: instructions, color: "RANDOM" }));
        return;
    } else {
        let userItem = await connection.getRepository(Item).findOne({ id: ctx.user.id, type: "FM" });
        if (!userItem) userItem = new Item({ id: ctx.user.id, title: "", type: "FM", time: Date.now() });
        userItem.time = Date.now();
        userItem.title = options.username;

        const lastTrack = await getMostRecentTrack(options.username);
        const avatar = ctx.user.dynamicAvatarURL("png");

        let trackEmbed = new MessageEmbed()
            .setAuthor(options.username, avatar, `https://www.last.fm/user/${options.username}`)
            .setTitle(`You have not scrobbled any songs yet. Is this your profile?`)
            .setDescription(
                `Please ensure you are linking the correct profile by going here\n**-->** https://www.last.fm/user/${options.username}\n\nThis should link to **your** last.fm profile.`
            )
            .setFooter("Respond with yes or no");

        if (lastTrack?.name) {
            trackEmbed = new MessageEmbed()
                .setAuthor(options.username, avatar, `https://www.last.fm/user/${options.username}`)
                .setTitle("This is your most recently scrobbled song. Does this look correct?")
                .addField("Track", lastTrack.name, true)
                .addField("Artist", lastTrack.artist, true)
                .addField("Album", lastTrack.album, true)
                .addField("Time", lastTrack.date, true)
                .setThumbnail(lastTrack.image)
                .setFooter("Respond with yes or no");
        }

        await ctx.embed(trackEmbed);

        const channel = client.guilds.cache.get(ctx.guildID || "")?.channels.cache.get(ctx.channelID) as TextChannel;

        let response: Message;
        try {
            const res = await MessageTools.awaitMessage(ctx.user.id, channel, 60 * 1000);
            if (!res?.content) throw new Error("No message content");
            response = res;
        } catch (e) {
            throw new CommandError(`You didn't reply soon enough, use \`/fm set\` again`);
        }

        if (response.content.toLowerCase() === "yes") {
            await connection.manager.save(userItem);
            ctx.embed(
                new MessageEmbed()
                    .setDescription(`Succesfully updated your FM username to \`${userItem.title}\``)
                    .setColor("RANDOM")
            );
        } else {
            ctx.embed(
                new MessageEmbed()
                    .setDescription("Okay, try using `/fm set` again to set the correct username.")
                    .setColor("RANDOM")
            );
            return;
        }
    }

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
};
