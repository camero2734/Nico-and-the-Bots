import { Command, CommandError, CommandMessage } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import { Item } from "database/entities/Item";
import { MessageEmbed } from "discord.js";
import { MessageTools } from "helpers";
import fetch from "node-fetch";
import { Connection } from "typeorm";
import { RecentTracksResponse } from "./fm";

export default new Command({
    name: "setfm",
    description: "Connects to your last.fm account",
    category: "Social",
    usage: "!setfm [your username]",
    example: "!setfm pootusmaximus",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const username = msg.argsString;
        if (!username) {
            // prettier-ignore
            const instructions =  
                `**To set up your fm account:**

                \`1.\` Go to <https://www.last.fm/> and set up your fm account.

                \`2.\` Link your last.fm account to whatever music streaming service you use. For spotify, follow these instructions: <https://community.spotify.com/t5/Spotify-Answers/How-can-I-connect-Spotify-to-Last-fm/ta-p/4795301>.

                \`3.\` Use the \`!setfm\` command followed by your **fm username**, for example:
                \`\`\`fix
                !setfm nico
                \`\`\`

                \`4.\` The \`!fm\` command should now work properly and display what you are currently listening to!`.replace(/^ +/gm,"");
            await msg.channel.send(MessageTools.textEmbed(instructions));
            return;
        } else {
            let userItem = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "FM" });
            if (!userItem) userItem = new Item({ id: msg.author.id, title: "", type: "FM", time: Date.now() });
            userItem.time = Date.now();
            userItem.title = username;

            const lastTrack = await getMostRecentTrack(username);
            const avatar = msg.author.avatarURL() as string;

            let trackEmbed = new MessageEmbed()
                .setAuthor(username, avatar, `https://www.last.fm/user/${username}`)
                .setTitle(`You have not scrobbled any songs yet. Is this your profile?`)
                .setDescription(
                    `Please ensure you are linking the correct profile by going here\n**-->** https://www.last.fm/user/${username}\n\nThis should link to **your** last.fm profile.`
                )
                .setFooter("Respond with yes or no");

            if (lastTrack?.name) {
                trackEmbed = new MessageEmbed()
                    .setAuthor(username, avatar, `https://www.last.fm/user/${username}`)
                    .setTitle("This is your most recently scrobbled song. Does this look correct?")
                    .addField("Track", lastTrack.name, true)
                    .addField("Artist", lastTrack.artist, true)
                    .addField("Album", lastTrack.album, true)
                    .addField("Time", lastTrack.date, true)
                    .setThumbnail(lastTrack.image)
                    .setFooter("Respond with yes or no");
            }

            await msg.channel.send(trackEmbed);

            let response;
            try {
                response = await MessageTools.awaitMessage(msg, 60 * 1000);
                if (!response?.content) throw new Error("No message content");
            } catch (e) {
                throw new CommandError(`You didn't reply soon enough, use \`!setfm\` again`);
            }

            if (response.content.toLowerCase() === "yes") {
                await connection.manager.save(userItem);
                msg.channel.send(
                    MessageTools.textEmbed(`Succesfully updated your FM username to \`${userItem.title}\``)
                );
            } else {
                await msg.channel.send(
                    MessageTools.textEmbed("Okay, try using `!setfm` again to set the correct username.")
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
    }
});
