import { Client, Guild, Intents, MessageAttachment, TextChannel } from "discord.js";
import { Connection } from "typeorm";
import { SiteWatcher } from "./websites";
import * as secrets from "configuration/secrets.json";
import { channelIDs, guildID } from "configuration/config";

export class TopfeedBot {
    client: Client;
    guild: Guild;
    ready: Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    websites: SiteWatcher<any>[] = [];
    ctx: { connection: Connection; client: Client };
    constructor(private connection: Connection) {
        this.client = new Client({ intents: Intents.ALL });
        this.client.login(secrets.bots.keons);

        this.ctx = { connection, client: this.client };

        this.#generateWebsites();

        this.ready = new Promise((resolve) => {
            this.client.on("ready", async () => {
                const guild = await this.client.guilds.fetch(guildID);
                this.guild = guild;
                resolve();
            });
        });
    }

    #generateWebsites(): void {
        this.websites = [new SiteWatcher("http://dmaorg.info", "DMAORG 404 Page", ["VISUAL"], this.ctx)];
    }

    async checkAll(): Promise<void> {
        await this.ready; // Wait until the bot is logged in
        const chan = this.guild.channels.cache.get(channelIDs.bottest) as TextChannel;

        for (const site of this.websites) {
            const [res] = await site.checkForChanges();
            await chan.send(res.messageObj);
        }
    }
}
