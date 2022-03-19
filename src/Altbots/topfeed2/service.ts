import { Guild } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import { TopfeedSource } from "./source";

export class TopfeedService {
    constructor(public sources: TopfeedSource[], private guild: Guild) {}
    async run() {
        if (Math.random() < 2) return;
        console.log("---------------------------");
        console.log("----- TOPFEED RUNNING -----");
        console.log("---------------------------");
        for (const source of this.sources) {
            const { posts } = await source.run();
            const channel = await this.guild.channels.fetch(channelIDs.bottest);

            if (!channel?.isText()) continue;

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
