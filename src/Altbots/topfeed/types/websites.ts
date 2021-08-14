import crypto from "crypto";
import Diff from "diff";
import { Client, MessageAttachment, MessageEmbed, MessageOptions } from "discord.js";
import https from "https";
import fetch from "node-fetch";
import normalizeURL from "normalize-url";
import PageRes from "pageres";
import R from "ramda";
import { Checked, Watcher } from "./base";

const watchMethods = <const>["VISUAL", "HTML", "LAST_MODIFIED"]; // Ordered by importance
type WATCH_METHOD = typeof watchMethods[number];

type ReturnType = { hash: string; html?: string };

type CheckReturn = ReturnType & { isNew: boolean } & (
        | { type: "HTML"; data: { html: string; diff: string } }
        | { type: "LAST_MODIFIED"; data: { lastModified: string } }
        | { type: "VISUAL"; data: { image: Buffer } }
    );

type CheckObj = {
    HTML: CheckReturn & { type: "HTML" };
    LAST_MODIFIED: CheckReturn & { type: "LAST_MODIFIED" };
    VISUAL: CheckReturn & { type: "VISUAL" };
};

const agent = new https.Agent({
    rejectUnauthorized: false
});

export class SiteWatcher<T extends ReadonlyArray<WATCH_METHOD>> extends Watcher<ReturnType> {
    static hash(input: string): string {
        return crypto.createHash("sha256").update(input).digest("base64");
    }

    displayedURL: string;
    type = "Website" as const;

    constructor(
        public url: string,
        public displayName: string,
        public watchMethods: T,
        protected ctx: { connection: any; client: Client }
    ) {
        super(url, "859592952108285992");
        this.displayedURL = url;
    }

    get httpURL(): string {
        return normalizeURL(this.url, { forceHttp: true });
    }

    get id(): string {
        return `WEBSITE:${this.displayName.split(" ").join("-").toUpperCase()}`;
    }

    setDisplayedURL(url: string): this {
        this.displayedURL = url;
        return this;
    }

    generateEmbed(type: Array<T[number]>, description: string, hash: string, file?: Buffer): MessageOptions {
        const embed = new MessageEmbed()
            .setAuthor(
                `${this.displayName} updated! [${type.join(" ")} change]`,
                this.ctx.client.user?.displayAvatarURL(),
                this.displayedURL
            )
            .setDescription(description)
            .setFooter(`${hash}`);

        if (file) {
            const att = new MessageAttachment(file, "file.png");
            embed.setImage("attachment://file.png");
            return { embeds: [embed], files: [att] };
        } else return { embeds: [embed] };
    }

    async fetchRecentItems(): Promise<Checked<ReturnType>[]> {
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
        if (validResponses.length === 0) return [];

        const obj = Object.fromEntries(
            watchMethods.map((t) => [t, validResponses.find((vr) => vr.type === t)]).filter((ent) => ent[1])
        ) as CheckObj;

        const desc = [
            obj.HTML ? `\`\`\`diff\n${obj.HTML.data.diff.substring(0, 1850)}\`\`\`` : undefined,
            obj.LAST_MODIFIED ? `> ${obj.LAST_MODIFIED.data.lastModified}` : undefined
        ]
            .filter((d) => d !== undefined)
            .join("\n");

        const hashes = Object.values(obj)
            .map((r) => r.hash)
            .join(", ");
        const file = obj.VISUAL?.data.image || undefined;

        const messageOpts = this.generateEmbed(R.keys(obj), desc, hashes, file);

        // return [{ msg: messageOpts, allResponses: response }];
        return null as any;
    }

    async #checkHTML(): Promise<CheckReturn> {
        const type = <const>"HTML";

        const res = await fetch(this.url, { agent });
        const buff = await res.buffer();
        const html = buff.toString("utf-8");
        const hash = SiteWatcher.hash(html);

        const old = await this.getLatestItem(type);

        const isNew = !old || old.data.hash !== hash;
        const diff = Diff.createPatch(this.id, old?.data.html || "", html);

        return { data: { html, diff }, isNew, type, hash };
    }

    async #checkLastModified(): Promise<CheckReturn> {
        const type = <const>"LAST_MODIFIED";

        const res = await fetch(this.url, { agent });
        const lastModified = res.headers.get("last-modified") || "Wed, 21 Oct 2015 07:28:00 GMT";
        const hash = SiteWatcher.hash(lastModified);

        const old = await this.getLatestItem(type);

        const isNew = !old || old.data.hash !== hash;

        return { data: { lastModified }, isNew, type, hash };
    }

    async #checkVisual(): Promise<CheckReturn> {
        const type = <const>"VISUAL";
        const [screenshot] = await new PageRes({ delay: 2 }).src(this.httpURL, ["1024x768"]).run();

        const base64 = screenshot.toString("base64");
        const hash = SiteWatcher.hash(base64);

        const old = await this.getLatestItem(type);

        const isNew = !old || old.data.hash !== hash;

        return { data: { image: screenshot }, isNew, type, hash };
    }
}
