import async from "async";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Attachment, MessageOptions } from "discord.js";
import TwitterApi, { MediaVideoInfoV1, TweetV2 } from "twitter-api-v2";
import VideoUrl from "video-url-link";
import secrets from "../../../Configuration/secrets";
import F from "../../../Helpers/funcs";
import { Checked, Watcher } from "./base";

type TweetType = {
    images: string[];
    date: Date;
    url: string;
    tweetType: string;
    tweeterUsername: string;
    tweeterImage?: string;
    tweetText: string;
};

const twitter = new TwitterApi(secrets.apis.twitter.bearer_token).readOnly;

export class TwitterWatcher extends Watcher<TweetType> {
    type = "Twitter" as const;
    userid: string;
    async fetchRecentItems(): Promise<Checked<TweetType>[]> {
        if (!this.userid) await this.fetchUserID();

        // Tweets, retweets
        const { tweets, includes } = await twitter.v2.userTimeline(this.userid, {
            expansions: ["referenced_tweets.id", "referenced_tweets.id.author_id", "attachments.media_keys"],
            "tweet.fields": [
                "created_at",
                "geo",
                "public_metrics",
                "in_reply_to_user_id",
                "referenced_tweets",
                "source"
            ],
            "media.fields": ["preview_image_url", "type", "url"],
            "user.fields": ["profile_image_url", "username"],
            max_results: 5
        });

        const checkedTweets: Checked<TweetType>[] = await async.mapSeries(tweets.slice(0, 1), async (tweet: TweetV2) => {
            const referencedTweet = tweet.referenced_tweets?.[0];
            const tweetType = referencedTweet?.type ? F.titleCase(referencedTweet.type) : "Tweeted";

            const nameRes = includes.users?.find((u) => u.id === referencedTweet?.id);
            const tweeterUsername = tweetType === "Retweeted" && nameRes ? nameRes.username : this.handle;
            const tweeterImage = includes.users?.find((u) => u.id === (nameRes?.id || this.userid))?.profile_image_url;

            const url = `https://twitter.com/${tweeterUsername}/status/${tweet.id}`;

            const videoURL = await this.getVideoInTweet(url);

            const images = videoURL
                ? [videoURL]
                : (tweet.attachments?.media_keys || [])
                    .map((mk) => includes.media?.find((m) => m.media_key === mk))
                    .map((m) => m?.url || m?.preview_image_url || "")
                    .filter((m) => m);

            const date = new Date(tweet.created_at || Date.now());

            return {
                uniqueIdentifier: tweet.id,
                ping: true,
                _data: {
                    images,
                    date,
                    url,
                    tweeterUsername,
                    tweetType,
                    tweeterImage,
                    tweetText: tweet.text
                }
            };
        });

        // Likes
        // TODO:

        return [...checkedTweets];
    }

    async generateMessages(checkedItems: Checked<TweetType>[]): Promise<MessageOptions[][]> {
        const TWITTER_IMG = "https://assets.stickpng.com/images/580b57fcd9996e24bc43c53e.png";
        return checkedItems.map((item) => {
            const { images, date, url, tweetType, tweetText, tweeterUsername, tweeterImage } = item._data;
            let title = `New Tweet from @${this.handle}`;

            if (tweetType !== "Tweeted" && tweeterUsername !== this.handle) {
                title = `@${this.handle} ${tweetType} @${tweeterUsername}`;
            }

            const mainEmbed = new EmbedBuilder()
                .setAuthor({ name: title, iconURL: TWITTER_IMG, url: url }) // prettier-ignore
                .setThumbnail(tweeterImage || TWITTER_IMG)
                .setColor(0x55adee)
                .setDescription(tweetText)
                .setTimestamp(date);

            const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
                new ButtonBuilder().setLabel("View Tweet").setStyle(ButtonStyle.Link).setURL(url)
            ]);

            const msgs: MessageOptions[] = [{ embeds: [mainEmbed], components: [actionRow] }];

            if (images.length > 0) {
                const firstIsVideo = images[0].includes(".mp4");
                if (!firstIsVideo) mainEmbed.setImage(images[0]);
                // TODO: Maybe set first frame as image for videos so the main msg isn't devoid of an image?

                const start = firstIsVideo ? 0 : 1;

                for (let i = start; i < images.length; i++) {
                    const image = images[i];

                    const embed = new EmbedBuilder().setTitle(`${i + 1}/${images.length}`);
                    const att = new Attachment(image);

                    const isVideo = image.includes(".mp4");
                    if (isVideo) {
                        msgs.push({ embeds: [embed] });
                        msgs.push({ files: isVideo ? [att] : undefined });
                    } else {
                        embed.setImage(image);
                        msgs.push({ embeds: [embed] });
                    }
                }
            }

            return msgs;
        });
    }

    /**
     * Refetch the tweet with V1 since Twitter API V2 doesn't return videos :(
     * @param tweet The V2 tweet object
     */
    async getVideoInTweet(tweetURL: string): Promise<string | undefined> {
        try {
            const url = await new Promise<string | undefined>((resolve) => {
                VideoUrl.twitter.getInfo(tweetURL, {}, (error, info: { variants: MediaVideoInfoV1["variants"] }) => {
                    if (error) {
                        resolve(undefined);
                    } else {
                        const variants = info?.variants?.sort((v1, v2) => v2.bitrate - v1.bitrate);
                        resolve(variants[0]?.url);
                    }
                });
            });

            return url;
        } catch (e) {
            return undefined;
        }
    }

    async fetchUserID(): Promise<void> {
        const res = await twitter.v2.userByUsername(this.handle);
        this.userid = res.data.id;
    }
}
/**
 * 
 * 

            
 */
