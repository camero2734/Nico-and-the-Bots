import crypto from "crypto";
import Diff from "diff";
import { Message, MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, MessageOptions } from "discord.js";
import http from "http";
import fetch from "node-fetch";
import normalizeURL from "normalize-url";
import PageRes from "pageres";
import R from "ramda";
import { Checked, Watcher } from "./base";

const watchMethods = <const>["VISUAL", "HTML", "LAST_MODIFIED"]; // Ordered by importance
type WATCH_METHOD = typeof watchMethods[number];

type CheckBase = { isNew: boolean; hash: string };

type CheckObj = {
    HTML: { _data: CheckBase & { subtype: "HTML"; html: string; diff: string } };
    LAST_MODIFIED: { _data: CheckBase & { subtype: "LAST_MODIFIED"; lastModified: string } };
    VISUAL: { _data: CheckBase & { subtype: "VISUAL"; image: Buffer } };
};

type CheckReturn = CheckObj[WATCH_METHOD]["_data"];

const agent = new http.Agent({});

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
        }) as Promise<CheckObj[WATCH_METHOD]["_data"]>[];
        const response = await Promise.all(promises);

        const validResponses = response.filter((r) => r.isNew);
        if (validResponses.length === 0) return [];

        return validResponses.map((res) => ({
            uniqueIdentifier: res.hash,
            ping: true,
            _data: res
        }));
    }

    async generateMessages(checkedItems: Checked<CheckReturn>[]): Promise<MessageOptions[][]> {
        if (checkedItems.length < 1) return [];

        const obj = Object.fromEntries(
            watchMethods.map((t) => [t, checkedItems.find((vr) => vr._data.subtype === t)]).filter((ent) => ent[1])
        ) as CheckObj;

        const desc = [
            obj.HTML ? `\`\`\`diff\n${obj.HTML._data.diff.substring(0, 1850)}\`\`\`` : undefined,
            obj.LAST_MODIFIED ? `> ${obj.LAST_MODIFIED._data.lastModified}` : undefined
        ]
            .filter((d) => d !== undefined)
            .join("\n");

        const hashes = Object.values(obj)
            .map((r) => r._data.hash)
            .join(", ");
        const file = obj.VISUAL?._data.image || undefined;

        const embed = new MessageEmbed()
            .setAuthor(
                `${this.displayName} updated! [${R.keys(obj).join(" ")} change]`,
                this.client.user?.displayAvatarURL(),
                this.displayedURL
            )
            .setDescription(desc)
            .setFooter(`${hashes}`);

        const actionRow = new MessageActionRow().addComponents([
            new MessageButton({ style: "LINK", url: this.displayedURL, label: "Live site" })
        ]);

        if (file) {
            const att = new MessageAttachment(file, "file.png");
            embed.setImage("attachment://file.png");
            return [[{ embeds: [embed], files: [att], components: [actionRow] }]];
        } else return [[{ embeds: [embed], components: [actionRow] }]];
    }

    override async afterCheck(msg: Message): Promise<void> {
        const actionRow = msg.components[0];

        const newButton = new MessageButton({
            style: "LINK",
            url: "https://google.com",
            disabled: true,
            label: "Fetching archive..."
        });

        actionRow.addComponents([newButton]);

        await msg.edit({ components: msg.components });

        const savedUrl = await this.#archivePage(this.url);

        actionRow.spliceComponents(actionRow.components.length - 1, 1);
        if (savedUrl) {
            actionRow.addComponents([new MessageButton({ style: "LINK", url: savedUrl, label: "Web Archive" })]);
        }
        await msg.edit({ components: msg.components });
    }

    async #checkHTML(): Promise<CheckObj["HTML"]["_data"]> {
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

    async #checkLastModified(): Promise<CheckObj["LAST_MODIFIED"]["_data"]> {
        const subtype = <const>"LAST_MODIFIED";

        const res = await fetch(this.url, { agent });
        const lastModified = res.headers.get("last-modified") || "Wed, 21 Oct 2015 07:28:00 GMT";
        const hash = SiteWatcher.hash(lastModified);

        const old = await this.getLatestItem(subtype);

        const isNew = !old || old.data.hash !== hash;

        return { lastModified, hash, isNew, subtype };
    }

    async #checkVisual(): Promise<CheckObj["VISUAL"]["_data"]> {
        const subtype = <const>"VISUAL";
        const [screenshot] = await new PageRes({ delay: 2 }).src(this.httpURL, ["1024x768"]).run();

        const base64 = screenshot.toString("base64");
        const hash = SiteWatcher.hash(base64);

        const old = await this.getLatestItem(subtype);

        const isNew = !old || old.data.hash !== hash;

        return { image: screenshot, hash, isNew, subtype };
    }

    async #archivePage(url: string): Promise<string | null> {
        const saveUrl = `https://web.archive.org/save/${url}`;
        try {
            const res = await fetch(saveUrl);
            const header = res.headers.get("X-Cache-Key"); // Something like httpsweb.archive.org/web/20210718183444/http://dmaorg.info/found/15398642_14/clancy.htmlUS
            if (!header) throw new Error("Header not present");

            const match = header.match(/https(?<url>web\.archive\.org\/web\/\d+?\/.*?)US/) || [];
            const url = match.groups?.url;

            return url ? `https://${url}` : null;
        } catch (e) {
            console.log(`[Web Archive Error]`, e);
            return null;
        }
    }
}
