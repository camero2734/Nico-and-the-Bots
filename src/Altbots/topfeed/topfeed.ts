import async from "async";
import { Client, Guild, MessageAttachment, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs, guildID } from "../../Configuration/config";
import secrets from "../../Configuration/secrets";
import { Watcher } from "./types/base";
import { InstaWatcher, setupInstagram } from "./types/instagram";
import { TwitterWatcher } from "./types/twitter";
import { SiteWatcher } from "./types/websites";
import { YoutubeWatcher } from "./types/youtube";
export class TopfeedBot {
    client: Client;
    guild: Guild;
    ready: Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    websites: SiteWatcher<any>[] = [];
    instagrams: InstaWatcher[] = [];
    twitters: TwitterWatcher[] = [];
    youtubes: YoutubeWatcher[] = [];
    constructor() {
        this.client = new Client({
            intents: [
                "GUILDS",
                "DIRECT_MESSAGES",
                "DIRECT_MESSAGE_REACTIONS",
                "GUILDS",
                "GUILD_BANS",
                "GUILD_EMOJIS_AND_STICKERS",
                "GUILD_INTEGRATIONS",
                "GUILD_INVITES",
                "GUILD_MEMBERS",
                "GUILD_MESSAGES",
                "GUILD_MESSAGE_REACTIONS",
                "GUILD_PRESENCES",
                "GUILD_VOICE_STATES",
                "GUILD_WEBHOOKS"
            ]
        });
        this.client.login(secrets.bots.keons);

        this.ready = new Promise((resolve) => {
            this.client.on("ready", async () => {
                const guild = await this.client.guilds.fetch(guildID);
                this.guild = guild;

                await this.#createWatchers();

                // Setup Instagram
                // await setupInstagram();

                resolve();
            });
        });
    }

    async #createWatchers(): Promise<void> {
        // prettier-ignore
        this.websites = [
            // new SiteWatcher("https://dmaorg.info", "DMAORG 404 Page", ["VISUAL", "HTML"], this.ctx),
            new SiteWatcher("http://dmaorg.info/found/15398642_14/clancy.html", "DMAORG Clancy Page", ["VISUAL", "HTML"]),
            // new SiteWatcher("https://21p.lili.network/c5ede9f92bcf8167e2475eda399ea2c815caade9", "Live Site", ["HTML", "LAST_MODIFIED"])
            //     .setDisplayedURL("https://live.twentyonepilots.com"),
        ];

        this.instagrams = [
            new InstaWatcher("twentyonepilots", "859592952108285992")
            // new InstaWatcher("joshuadun", "Josh", channelIDs.josh)
        ];

        this.twitters = [
            new TwitterWatcher("twentyonepilots", "859592952108285992")
            //
        ];

        this.youtubes = [new YoutubeWatcher("twentyonepilots", "859592952108285992")];
    }

    async #checkGroup<U>(watchers: Watcher<U>[]): Promise<void> {
        if (watchers.length === 0) return;
        const chan = this.guild.channels.cache.get(channelIDs.bottest) as TextChannel;

        console.log(`Checking watchers ${watchers[0].type}`);

        const watchersType = watchers[0].type;

        for (const watcher of watchers) {
            if (watcher.type !== watchersType) {
                throw new Error("checkGroup must be called with an array of the same types of watchers");
            }

            const [_items, allMsgs] = await watcher.fetchNewItems();
            for (const post of allMsgs) {
                // First msg is sent to channel, rest are threaded
                const [mainMsg, ...threadedMsgs] = post;

                const partialTitle =
                    `${mainMsg.embeds?.[0]?.description?.substring(0, 20)}...` || `${watchersType} post`;
                const threadTitle = `${partialTitle} - Media Content`.replaceAll("\n", " ").trim();

                const threadStarter = await chan.send(mainMsg);
                if (threadedMsgs.length < 1) {
                    watcher.afterCheck(threadStarter);
                    continue;
                }

                const shouldAvoidThread = watcher.type === "Youtube";
                if (shouldAvoidThread) {
                    for (const msg of threadedMsgs) {
                        await chan.send(msg);
                    }
                    watcher.afterCheck(threadStarter);
                    continue;
                }

                const thread = await threadStarter.startThread({
                    name: threadTitle,
                    autoArchiveDuration: 60
                });

                try {
                    for (const msg of threadedMsgs) {
                        await thread.send(msg);
                    }
                } catch (e) {
                    console.log(e);
                }

                // Automatically archive the channel
                await thread.setArchived(true);

                watcher.afterCheck(threadStarter);
            }
        }
    }

    async checkAll(): Promise<void> {
        await this.ready; // Wait  until the bot is logged in
        await this.#checkGroup(this.youtubes);
        // await this.#checkGroup(this.websites);
        // await this.#checkGroup(this.twitters);
        // await this.#checkGroup(this.instagrams);
    }
}
