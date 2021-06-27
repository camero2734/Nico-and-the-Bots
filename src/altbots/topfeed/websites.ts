import fetch from "node-fetch";
import https from "https";
import crypto from "crypto";
import * as Diff from "diff";
import R from "ramda";
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
    hash: string;
} & (
    | { type: "HTML"; data: { html: string; diff: string } }
    | { type: "LAST_MODIFIED"; data: { lastModified: string } }
    | { type: "VISUAL"; data: { image: Buffer } }
);

type CheckReturnWithType<T extends WATCH_METHOD> = CheckReturn & { type: T };

type CheckObj = Partial<{
    HTML: CheckReturnWithType<"HTML">;
    LAST_MODIFIED: CheckReturnWithType<"LAST_MODIFIED">;
    VISUAL: CheckReturnWithType<"VISUAL">;
}>;

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

    generateEmbed(type: Array<T[number]>, description: string, hash: string, file?: Buffer): MessageOptions {
        const embed = new MessageEmbed()
            .setAuthor(
                `${this.displayName} updated! [${type.join(" ")} change]`,
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
    async checkForChanges(): Promise<{ msgOpts?: MessageOptions; allResponses: CheckReturn[] }> {
        const response = await Promise.all(
            this.watchMethods.map((wm) => {
                // prettier-ignore
                switch(wm) {
                    case "HTML": return this.#checkHTML();
                    case "LAST_MODIFIED": return this.#checkLastModified();
                    case "VISUAL": return this.#checkVisual();
                }
            })
        );

        const validResponses = response.filter((r) => r.isNew);
        if (validResponses.length === 0) return { allResponses: response };

        const obj = Object.fromEntries(
            watchMethods.map((t) => [t, validResponses.find((vr) => vr.type === t)]).filter((ent) => ent[1])
        ) as CheckObj;
        const desc = obj.HTML ? `\`\`\`diff\n${obj.HTML?.data.diff.substring(0, 2000)}\`\`\`` : "";
        const hashes = Object.values(obj)
            .map((r) => r.hash)
            .join(", ");
        const file = obj.VISUAL?.data.image || undefined;

        const messageOpts = this.generateEmbed(R.keys(obj), desc, hashes, file);

        return { msgOpts: messageOpts, allResponses: response };
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

        return { data: { html, diff }, isNew, ping: isNew, type, hash };
    }

    async #checkLastModified(): Promise<CheckReturn> {
        const type = <const>"LAST_MODIFIED";

        const res = await fetch(this.url, { agent });
        const lastModified = res.headers.get("last-modified") || "Wed, 21 Oct 2015 07:28:00 GMT";
        const hash = SiteWatcher.hash(lastModified);

        const old = (await this.getTopfeedObject(type)) || new Topfeed({ url: this.url, type, hash: "" });

        const isNew = old?.hash !== hash;

        return { data: { lastModified }, isNew, ping: isNew, type, hash };
    }

    async #checkVisual(): Promise<CheckReturn> {
        const type = <const>"VISUAL";
        const [screenshot] = await new PageRes({ delay: 2 }).src(this.url, ["1024x768"]).run();

        const base64 = screenshot.toString("base64");
        const hash = SiteWatcher.hash(base64);

        const old = (await this.getTopfeedObject("VISUAL")) || new Topfeed({ url: this.url, type: "VISUAL", hash: "" });

        const isNew = old?.hash !== hash;

        return { data: { image: screenshot }, isNew, ping: isNew, type, hash };
    }
}
