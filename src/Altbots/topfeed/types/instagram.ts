// import { EmbedBuilder, BaseMessageOptions } from "discord.js";
// import { IgApiClient, UserFeedResponseItemsItem } from "instagram-private-api";
// import secrets from "../../../Configuration/secrets";
// import { Checked, Watcher } from "./base";

// const ig = new IgApiClient();
// ig.state.generateDevice(secrets.apis.instagram.username);

// export const setupInstagram = async (): Promise<void> => {
//     // Execute all requests prior to authorization in the real Android application
//     await ig.qe.syncLoginExperiments();
//     await ig.account.login(secrets.apis.instagram.username, secrets.apis.instagram.password);
//     process.nextTick(async () => await ig.simulate.postLoginFlow());
// };

// export interface InstagramPost {
//     images: string[];
//     caption: string;
//     date: Date;
//     url: string;
//     _data: UserFeedResponseItemsItem;
// }

// type InstaType = {
//     url: string;
//     images: string[];
//     caption?: string;
//     date: Date;
// };

// export class InstaWatcher extends Watcher<InstaType> {
//     type = "Instagram" as const;
//     async fetchRecentItems(): Promise<Checked<InstaType>[]> {
//         const pk = await ig.user.getIdByUsername(this.handle);
//         const feed = ig.feed.user(pk);

//         const items = await feed.items();

//         return items.map((item) => {
//             const _images = item.carousel_media?.map((c) => c.image_versions2) || [item.image_versions2];
//             const images = _images.map((i) => i.candidates[0].url);
//             const caption = item.caption?.text;
//             const date = new Date(item.taken_at * 1000);
//             const url = `https://instagram.com/p/${item.code}`;

//             return {
//                 uniqueIdentifier: item.id,
//                 ping: false,
//                 _data: {
//                     url,
//                     images,
//                     caption,
//                     date
//                 }
//             };
//         });
//     }

//     async generateMessages(checkedItems: Checked<InstaType>[]): Promise<BaseMessageOptions[][]> {
//         return checkedItems.map((item) => {
//             const { url, caption, images, date } = item._data;

//             // const msgs: BaseMessageOptions[] = [];

//             const mainEmbed = new EmbedBuilder()
//                 .setAuthor({
//                     name: `@${this.handle} posted on Instagram`,
//                     iconURL: "https://i.imgur.com/a5YxpVK.png",
//                     url
//                 })
//                 .setColor(0xdd2a7b)
//                 .setDescription(caption || "*No caption*")
//                 .setImage(images[0])
//                 .setTimestamp(date);

//             const additionalEmbeds = images.slice(1).map((image, idx) => {
//                 return new EmbedBuilder().setTitle(`${idx + 2}/${images.length}`).setImage(image);
//             });
//             return [{ embeds: [mainEmbed, ...additionalEmbeds] }];
//         });
//     }
// }
