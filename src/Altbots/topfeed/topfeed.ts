import consola from "consola";
import { minutesToMilliseconds } from "date-fns";
import { Client, Guild, TextChannel } from "discord.js/packages/discord.js";
import { channelIDs, guildID, roles } from "../../Configuration/config";
import secrets from "../../Configuration/secrets";
import F from "../../Helpers/funcs";
import { rollbar } from "../../Helpers/logging/rollbar";
import { Watcher } from "./types/base";
import { InstaWatcher, setupInstagram } from "./types/instagram";
import { TwitterWatcher } from "./types/twitter";
import { SiteWatcher } from "./types/websites";
import { YoutubeWatcher } from "./types/youtube";
import { JobType, queue } from "./worker";

const onHeroku = process.env.ON_HEROKU === "1";
class TopfeedBot {
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
                "Guilds",
                "DirectMessages",
                "DirectMessageReactions",
                "GuildBans",
                "GuildEmojisAndStickers",
                "GuildMembers",
                "GuildMessages",
                "GuildIntegrations",
                "GuildInvites",
                "GuildPresences",
                "GuildVoiceStates",
                "GuildWebhooks"
            ]
        });
        this.client.login(secrets.bots.keons);

        this.ready = new Promise((resolve) => {
            this.client.on("ready", async () => {
                const guild = await this.client.guilds.fetch(guildID);
                this.guild = guild;

                await this.#createWatchers();

                // Setup Instagram
                // Instagram doesn't run in dev since logging in so often gets the account flagged
                if (onHeroku) await setupInstagram();

                resolve();
            });
        });
    }

    async #createWatchers(): Promise<void> {
        // prettier-ignore
        this.websites = [
            new SiteWatcher("https://dmaorg.info", "DMAORG 404 Page", ["VISUAL", "HTML"]),
            new SiteWatcher("https://dmaorg.info/found/15398642_14/clancy.html", "DMAORG Clancy Page", ["VISUAL", "HTML"]),
            new SiteWatcher("https://21p.lili.network/c5ede9f92bcf8167e2475eda399ea2c815caade9", "Live Site", ["HTML", "LAST_MODIFIED"])
                .setDisplayedURL("https://live.twentyonepilots.com"),
            new SiteWatcher("https://twentyonepilots.com", "Band Homepage", ["VISUAL"], channelIDs.topfeed.band)
        ];

        this.instagrams = [
            new InstaWatcher("twentyonepilots", channelIDs.topfeed.band, roles.topfeed.selectable.band),
            new InstaWatcher("joshuadun", channelIDs.topfeed.josh, roles.topfeed.selectable.josh),
            new InstaWatcher("tylerrjoseph", channelIDs.topfeed.tyler, roles.topfeed.selectable.tyler)
        ];

        this.twitters = [
            new TwitterWatcher("twentyonepilots", channelIDs.topfeed.band, roles.topfeed.selectable.band),
            new TwitterWatcher("tylerrjoseph", channelIDs.topfeed.tyler, roles.topfeed.selectable.tyler),
            new TwitterWatcher("joshuadun", channelIDs.topfeed.josh, roles.topfeed.selectable.josh)
            //
        ];

        this.youtubes = [
            new YoutubeWatcher("twentyonepilots", channelIDs.topfeed.band, roles.topfeed.selectable.band),
            new YoutubeWatcher("slushieguys", channelIDs.topfeed.tyler, roles.topfeed.selectable.tyler)
        ];
    }

    async #checkGroup<U>(watchers: Watcher<U>[]): Promise<void> {
        if (watchers.length === 0) return;

        const watchersType = watchers[0].type;

        // Instagram doesn't run in dev since logging in so often gets the account flagged
        if (watchersType === "Instagram" && !onHeroku) return;

        consola.info(`Checking watchers ${watchersType}`);

        for (const watcher of watchers) {
            if (watcher.type !== watchersType) {
                throw new Error("checkGroup must be called with an array of the same types of watchers");
            }

            const chan = (await this.guild.channels.fetch(watcher.channel)) as TextChannel;

            consola.info(`  Checking ${watchersType} ${watcher.handle}`);

            const [_items, allMsgs] = await watcher.fetchNewItems();
            for (const post of allMsgs) {
                // First msg is sent to channel, rest are threaded
                const [mainMsg, ...threadedMsgs] = post;

                const partialTitle =
                    `${mainMsg.embeds?.[0]?.description?.substring(0, 20)}...` || `${watchersType} post`;
                const threadTitle = `${partialTitle} - Media Content`.replaceAll("\n", " ").trim();

                const threadStarter = await chan.send({...mainMsg, content: `<@&${watcher.pingedRole}>\n${mainMsg.content ?? ""}`}); // prettier-ignore
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

    async checkGroup(jobType: JobType): Promise<void> {
        const methods: Record<JobType, () => void> = {
            YOUTUBE: () => this.#checkGroup(this.youtubes),
            INSTAGRAM: () => this.#checkGroup(this.instagrams),
            TWITTER: () => this.#checkGroup(this.twitters),
            WEBSITES: () => this.#checkGroup(this.websites)
        };
        if (methods[jobType]) methods[jobType]();
        else rollbar.error(new Error("Invalid JobType"));
    }

    async registerChecks(): Promise<void> {
        await this.ready;
        const numMinutes: Record<JobType, number> = {
            YOUTUBE: 5,
            INSTAGRAM: 15,
            TWITTER: 2,
            WEBSITES: 1
        };

        console.log(await queue.getDelayedCount());

        for (const [jobType, mins] of F.entries(numMinutes)) {
            await queue.add(jobType, "", { repeat: { every: minutesToMilliseconds(mins) } });
        }
    }
}

// Singleton 😤
const topfeedBot = new TopfeedBot();
export default topfeedBot;
