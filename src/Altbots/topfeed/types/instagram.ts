import { MessageEmbed } from "discord.js";
import { IgApiClient, UserFeedResponseItemsItem } from "instagram-private-api";
import secrets from "../../../Configuration/secrets";
import { Checked, Watcher } from "./base";

const ig = new IgApiClient();
ig.state.generateDevice(secrets.apis.instagram.username);

export const setupInstagram = async (): Promise<void> => {
    // Execute all requests prior to authorization in the real Android application
    // await ig.simulate.preLoginFlow();
    await ig.account.login(secrets.apis.instagram.username, secrets.apis.instagram.password);
    process.nextTick(async () => await ig.simulate.postLoginFlow());
};

export interface InstagramPost {
    images: string[];
    caption: string;
    date: Date;
    url: string;
    _data: UserFeedResponseItemsItem;
}

export class InstaWatcher extends Watcher<UserFeedResponseItemsItem> {
    type = "Instagram" as const;
    override async fetchRecentItems(): Promise<Checked<UserFeedResponseItemsItem>[]> {
        const pk = await ig.user.getIdByUsername(this.handle);
        const feed = ig.feed.user(pk);

        const items = await feed.items();

        return items.map((item) => {
            const _images = item.carousel_media?.map((c) => c.image_versions2) || [item.image_versions2];
            const images = _images.map((i) => i.candidates[0].url);
            const caption = item.caption?.text || "*No caption*";
            const date = new Date(item.taken_at * 1000);
            const url = `https://instagram.com/p/${item.code}`;

            const mainEmbed = new MessageEmbed()
                .setAuthor(`@${this.handle} posted on Instagram`, "https://i.imgur.com/a5YxpVK.png", url)
                .setColor("#DD2A7B")
                .setDescription(caption)
                .setImage(images[0])
                .setTimestamp(date);

            const additionalEmbeds = images.slice(1).map((image, idx) => {
                return new MessageEmbed().setTitle(`${idx + 2}/${images.length}`).setImage(image);
            });

            return {
                uniqueIdentifier: item.id,
                msg: { embeds: [mainEmbed, ...additionalEmbeds] },
                _data: item
            };
        });
    }
}
