import crypto from "crypto";
import Diff from "diff";
import { MessageAttachment, MessageEmbed, MessageOptions } from "discord.js";
import https from "https";
import fetch from "node-fetch";
import normalizeURL from "normalize-url";
import PageRes from "pageres";
import R from "ramda";
import { Checked, Watcher } from "./base";

const watchMethods = <const>["VISUAL", "HTML", "LAST_MODIFIED"]; // Ordered by importance
type WATCH_METHOD = typeof watchMethods[number];

type CheckBase = { isNew: boolean; hash: string };

type CheckObj = {
    HTML: CheckBase & { subtype: "HTML"; html: string; diff: string };
    LAST_MODIFIED: CheckBase & { subtype: "LAST_MODIFIED"; lastModified: string };
    VISUAL: CheckBase & { subtype: "VISUAL"; image: Buffer };
};

type CheckReturn = CheckObj[WATCH_METHOD];

const agent = new https.Agent({
    rejectUnauthorized: false
});

export class SiteWatcher<T extends ReadonlyArray<WATCH_METHOD>> extends Watcher<CheckReturn> {
    static hash(input: string): string {
        return crypto.createHash("sha256").update(input).digest("base64");
    }

    displayedURL: string;
    type = "Website" as const;

    constructor(public url: string, public displayName: string, public watchMethods: T) {
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

    async fetchRecentItems(): Promise<Checked<CheckReturn>[]> {
        const promises = this.watchMethods.map((wm) => {
            return {
                HTML: () => this.#checkHTML(),
                LAST_MODIFIED: () => this.#checkLastModified(),
                VISUAL: () => this.#checkVisual()
            }[wm]();
        }) as Promise<CheckObj[typeof watchMethods[number]]>[];
        const response = await Promise.all(promises);

        const validResponses = response.filter((r) => r.isNew);
        if (validResponses.length === 0) return [];

        return validResponses.map((res) => ({
            uniqueIdentifier: res.hash,
            ping: true,
            _data: res
        }));
    }

    generateMessages(checkedItems: Checked<CheckReturn>[]): MessageOptions[] {
        const obj = Object.fromEntries(
            watchMethods.map((t) => [t, checkedItems.find((vr) => vr._data.subtype === t)]).filter((ent) => ent[1])
        ) as CheckObj;

        const desc = [
            obj.HTML ? `\`\`\`diff\n${obj.HTML.diff.substring(0, 1850)}\`\`\`` : undefined,
            obj.LAST_MODIFIED ? `> ${obj.LAST_MODIFIED.lastModified}` : undefined
        ]
            .filter((d) => d !== undefined)
            .join("\n");

        const hashes = Object.values(obj)
            .map((r) => r.hash)
            .join(", ");
        const file = obj.VISUAL?.image || undefined;

        const embed = new MessageEmbed()
            .setAuthor(
                `${this.displayName} updated! [${R.keys(obj).join(" ")} change]`,
                this.client.user?.displayAvatarURL(),
                this.displayedURL
            )
            .setDescription(desc)
            .setFooter(`${hashes}`);

        if (file) {
            const att = new MessageAttachment(file, "file.png");
            embed.setImage("attachment://file.png");
            return [{ embeds: [embed], files: [att] }];
        } else return [{ embeds: [embed] }];
    }

    async #checkHTML(): Promise<CheckObj["HTML"]> {
        const subtype = <const>"HTML";

        const res = await fetch(this.url, { agent });
        const buff = await res.buffer();
        const html = buff.toString("utf-8");
        const hash = SiteWatcher.hash(html);

        const old = await this.getLatestItem(subtype);

        const isNew = !old || old?.data.hash !== hash;
        const diff = Diff.createPatch(this.id, old?.data.html || "", html);

        return { html, diff, hash, isNew, subtype };
    }

    async #checkLastModified(): Promise<CheckObj["LAST_MODIFIED"]> {
        const subtype = <const>"LAST_MODIFIED";

        const res = await fetch(this.url, { agent });
        const lastModified = res.headers.get("last-modified") || "Wed, 21 Oct 2015 07:28:00 GMT";
        const hash = SiteWatcher.hash(lastModified);

        const old = await this.getLatestItem(subtype);

        const isNew = !old || old.data.hash !== hash;

        return { lastModified, hash, isNew, subtype };
    }

    async #checkVisual(): Promise<CheckObj["VISUAL"]> {
        const subtype = <const>"VISUAL";
        const [screenshot] = await new PageRes({ delay: 2 }).src(this.httpURL, ["1024x768"]).run();

        const base64 = screenshot.toString("base64");
        const hash = SiteWatcher.hash(base64);

        const old = await this.getLatestItem(subtype);

        const isNew = !old || old.data.hash !== hash;

        return { image: screenshot, hash, isNew, subtype };
    }
}
