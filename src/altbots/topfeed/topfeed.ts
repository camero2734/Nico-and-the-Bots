import { Client, Guild, Intents, MessageAttachment, TextChannel } from "discord.js";
import { Connection } from "typeorm";
import { SiteWatcher } from "./types/websites";
import secrets from "../../configuration/secrets";
import { channelIDs, guildID } from "../../configuration/config";
import { setupInstagram, InstaWatcher } from "./types/instagram";
import { TwitterWatcher } from "./types/twitter";
import { Watcher } from "./types/base";
export class TopfeedBot {
    client: Client;
    guild: Guild;
    ready: Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    websites: SiteWatcher<any>[] = [];
    instagrams: InstaWatcher[] = [];
    twitters: TwitterWatcher[];
    ctx: { connection: Connection; client: Client };
    constructor(private connection: Connection) {
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

        this.ctx = { connection, client: this.client };

        this.ready = new Promise((resolve) => {
            this.client.on("ready", async () => {
                const guild = await this.client.guilds.fetch(guildID);
                this.guild = guild;

                await this.#createWatchers();

                // Setup Instagram
                await setupInstagram();

                resolve();
            });
        });
    }

    async #createWatchers(): Promise<void> {
        // prettier-ignore
        this.websites = [
            // new SiteWatcher("https://dmaorg.info", "DMAORG 404 Page", ["VISUAL", "HTML"], this.ctx),
            // new SiteWatcher("http://dmaorg.info/found/15398642_14/clancy.html", "DMAORG Clancy Page", ["VISUAL", "HTML"], this.ctx),
            new SiteWatcher("https://21p.lili.network/c5ede9f92bcf8167e2475eda399ea2c815caade9", "Live Site", ["HTML", "LAST_MODIFIED"], this.ctx)
                .setDisplayedURL("https://live.twentyonepilots.com"),
        ];

        this.instagrams = [
            new InstaWatcher("twentyonepilots", channelIDs.tyler, this.ctx.connection)
            // new InstaWatcher("joshuadun", "Josh", channelIDs.josh)
        ];

        this.twitters = [
            new TwitterWatcher("twentyonepilots", channelIDs.tyler, this.ctx.connection)
            //
        ];
    }

    async checkGroup(watchers: Watcher<unknown>[]): Promise<void> {
        const chan = this.guild.channels.cache.get(channelIDs.bottest) as TextChannel;

        for (const watcher of watchers) {
            const items = await watcher.fetchNewItems();
            for (const item of items.slice(0, 1)) {
                await chan.send(item.msg);
            }
        }
    }

    async checkAll(): Promise<void> {
        await this.ready; // Wait  until the bot is logged in
        await this.checkGroup(this.twitters);
        // await this.checkGroup(this.instagrams);
    }
}
