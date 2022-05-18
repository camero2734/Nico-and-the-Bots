import { ITopfeedPost, ITopfeedRunOutput, ITopfeedSourceInput, TopfeedSource } from "../source";
import { IVideo, TTScraper } from "tiktok-scraper-ts";
import { MessageOptions } from "discord.js";
import { EmbedBuilder } from "discord.js";
import secrets from "../../../Configuration/secrets";

interface ITiktokSourceInput extends ITopfeedSourceInput {
    username: string;
}

const TikTokScraper = new TTScraper();

export class TiktokSource extends TopfeedSource {
    type = "Tiktok";
    username: string;

    userId: string | null = null;
    sessionList = [`sid_tt=${secrets.apis.tiktok.sid_tt};`];

    constructor(opts: ITiktokSourceInput) {
        super(opts);
        this.username = opts.username;
    }
    async run(): Promise<ITopfeedRunOutput> {
        const tiktoks = await this.fetchTiktoksByUsername(this.username);
        console.log(tiktoks, /TIKTOKS/);

        const posts = await Promise.all(tiktoks.map((t) => this.generatePost(t)));

        return {
            posts
        };
    }

    private async generatePost(post: IVideo): Promise<ITopfeedPost> {
        const title = `New Tiktok Post from ${this.displayName}`;

        const embed = new EmbedBuilder()
            .setDescription(post.description || "*No caption*")
            .setImage(post.cover || null)
            .setColor(0xfe2c55)
            .setTitle(title);

        const embedMessage: MessageOptions = {
            embeds: [embed]
        };

        const threadedMessage: MessageOptions = {
            content: post.downloadURL
        };

        return {
            id: this.genId(post.id),
            name: title,
            messages: [embedMessage, threadedMessage]
        };
    }

    private async fetchTiktoksByUsername(username: string): Promise<IVideo[]> {
        try {
            if (!this.userId) {
                // const res = await TiktokScraper.getUserProfileInfo("tiktok", { sessionList: this.sessionList });
                // this.userId = res.user.id;
                this.userId = "6812804163497198598";
            }

            console.log(`Scraping for ${this.userId} with sid_tt=${secrets.apis.tiktok.sid_tt}`);
            const posts = await TikTokScraper.getAllVideosFromUser(this.username);
            return posts.slice(0, 5);
        } catch (error) {
            console.log(error);
            return [];
        }
    }
}
