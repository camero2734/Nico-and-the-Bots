import fetch from "node-fetch";
import https from "https";
import crypto from "crypto";
import * as Diff from "diff";
import PageRes from "pageres";
import { Connection } from "typeorm";
import { Topfeed } from "database/entities/Topfeed";
import { Client, MessageAttachment, MessageEmbed, MessageOptions } from "discord.js";

const watchMethods = <const>["VISUAL", "HTML", "LAST_MODIFIED"]; // Ordered by importance
type WATCH_METHOD = typeof watchMethods[number];

type CheckReturn = {
    isNew: boolean;
    ping: boolean;
    type: WATCH_METHOD;
    messageObj: MessageOptions;
} & (
    | { type: "HTML"; data: { html: string; hash: string; diff: string } }
    | { type: "LAST_MODIFIED"; data: { lastModified: string } }
    | { type: "VISUAL"; data: { image: Buffer; hash: string } }
);

const agent = new https.Agent({
    rejectUnauthorized: false
});

export class SiteWatcher<T extends ReadonlyArray<WATCH_METHOD>> {
    static hash(input: string): string {
        return crypto.createHash("sha256").update(input).digest("base64");
    }

    constructor(
        public url: string,
        public displayName: string,
        public watchMethods: T,
        protected ctx: { connection: Connection; client: Client }
    ) {}

    get id(): string {
        return `WEBSITE:${this.displayName.split(" ").join("-").toUpperCase()}`;
    }

    async getTopfeedObject(type: T[number]): Promise<Topfeed | undefined> {
        return await this.ctx.connection.getRepository(Topfeed).findOne({ url: this.url, type });
    }

    generateEmbed(type: T[number], description: string, hash: string, file?: Buffer): MessageOptions {
        const embed = new MessageEmbed()
            .setAuthor(
                `${this.displayName} updated! [${type} change]`,
                this.ctx.client.user?.displayAvatarURL(),
                this.url
            )
            .setDescription(description)
            .setFooter(`${hash}`);

        if (file) {
            const att = new MessageAttachment(file, "file.png");
            embed.setImage("attachment://file.png");
            return { embeds: [embed], files: [att] };
        } else return { embeds: [embed] };
    }

    /** Returns changes ordered by importance (Visual -> HTML -> Last Modified) and a combined MessageObj */
    async checkForChanges(): Promise<CheckReturn[]> {
        const res = await Promise.all(
            this.watchMethods.map((wm) => {
                // prettier-ignore
                switch(wm) {
                    case "HTML": return this.#checkHTML();
                    case "LAST_MODIFIED": return this.#checkLastModified();
                    case "VISUAL": return this.#checkVisual();
                }
            })
        );
        const validResponses = res.filter((r) => r.isNew);
        if (validResponses.length === 0) return [];
        else return validResponses.sort((a, b) => watchMethods.indexOf(b.type) - watchMethods.indexOf(a.type));
    }

    async #checkHTML(): Promise<CheckReturn> {
        const type = <const>"HTML";

        const res = await fetch(this.url, { agent });
        const buff = await res.buffer();
        const html = buff.toString("utf-8");
        const hash = SiteWatcher.hash(html);

        const old = (await this.getTopfeedObject(type)) || new Topfeed({ url: this.url, type, hash: "" });

        const isNew = old?.hash !== hash;
        const diff = Diff.createPatch(this.id, old.data || "", html);

        const messageObj = this.generateEmbed(type, `\`\`\`diff\n${diff.substring(0, 2000)}\`\`\``, hash);

        return { data: { hash, html, diff }, isNew, ping: isNew, type, messageObj };
    }

    async #checkLastModified(): Promise<CheckReturn> {
        const type = <const>"LAST_MODIFIED";

        const res = await fetch(this.url, { agent });
        const lastModified = res.headers.get("last-modified") || "Wed, 21 Oct 2015 07:28:00 GMT";
        const hash = SiteWatcher.hash(lastModified);

        const old = (await this.getTopfeedObject(type)) || new Topfeed({ url: this.url, type, hash: "" });

        const isNew = old?.hash !== hash;

        const messageObj = this.generateEmbed(type, lastModified, hash);

        return { data: { lastModified }, isNew, ping: isNew, type, messageObj };
    }

    async #checkVisual(): Promise<CheckReturn> {
        const type = <const>"VISUAL";
        const [screenshot] = await new PageRes({ delay: 2 }).src(this.url, ["1024x768"]).run();

        const base64 = screenshot.toString("base64");
        const hash = SiteWatcher.hash(base64);

        const old = (await this.getTopfeedObject("VISUAL")) || new Topfeed({ url: this.url, type: "VISUAL", hash: "" });

        const isNew = old?.hash !== hash;

        const messageObj = this.generateEmbed(type, "*No description*", hash, screenshot);

        return { data: { image: screenshot, hash }, isNew, ping: isNew, type, messageObj };
    }
}
