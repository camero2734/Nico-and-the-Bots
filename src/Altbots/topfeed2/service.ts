import { Guild } from "discord.js";
import { TopfeedSource } from "./source";

export class TopfeedService {
    constructor(public sources: TopfeedSource[], private guild: Guild) { }
    async run() {
        console.log("---------------------------");
        console.log("----- TOPFEED RUNNING -----");
        console.log("---------------------------");
        for (const source of this.sources) {
            const { posts } = await source.run();
            const channel = await this.guild.channels.fetch("859592952108285992");

            console.log(channel?.isTextBased(), /CHAN_TEXT/);

            if (!channel?.isTextBased()) continue;

            console.log(posts, /POSTS/);

            for (const post of posts) {
                const [topMsg, ...threadedMsgs] = post.messages;
                const threadStarter = await channel.send(topMsg);

                const threadTitle = post.id;

                const thread = await threadStarter.startThread({
                    name: threadTitle,
                    autoArchiveDuration: 60
                });

                for (const msg of threadedMsgs) {
                    await thread.send(msg);
                }

                await thread.setArchived(true);
            }
        }
    }
}
