import { MessageEmbed, MessageOptions } from "discord.js";
import TwitterApi from "twitter-api-v2";
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

        return tweets.map((tweet) => {
            const images = (tweet.attachments?.media_keys || [])
                .map((mk) => includes.media?.find((m) => m.media_key === mk))
                .map((m) => m?.url || m?.preview_image_url || "")
                .filter((m) => m);

            const date = new Date(tweet.created_at || Date.now());

            const referencedTweet = tweet.referenced_tweets?.[0];
            const tweetType = referencedTweet?.type ? F.titleCase(referencedTweet.type) : "Tweeted";

            const nameRes = includes.users?.find((u) => u.id === referencedTweet?.id);
            const tweeterUsername = tweetType === "Retweeted" && nameRes ? nameRes.username : this.handle;
            const tweeterImage = includes.users?.find((u) => u.id === (nameRes?.id || this.userid))?.profile_image_url;

            return {
                uniqueIdentifier: tweet.id,
                ping: true,
                _data: {
                    images,
                    date,
                    url: `https://twitter.com/${tweeterUsername}/status/${tweet.id}`,
                    tweeterUsername,
                    tweetType,
                    tweeterImage,
                    tweetText: tweet.text
                }
            };
        });
    }

    generateMessages(checkedItems: Checked<TweetType>[]): MessageOptions[] {
        const TWITTER_IMG = "https://assets.stickpng.com/images/580b57fcd9996e24bc43c53e.png";
        return checkedItems.map((item) => {
            const { images, date, url, tweetType, tweetText, tweeterUsername, tweeterImage } = item._data;
            let title = `New Tweet from @${this.handle}`;

            if (tweetType !== "Tweeted" && tweeterUsername !== this.handle) {
                title = `@${this.handle} ${tweetType} @${tweeterUsername}`;
            }

            const mainEmbed = new MessageEmbed()
                .setAuthor(title, TWITTER_IMG, url) // prettier-ignore
                .setThumbnail(tweeterImage || TWITTER_IMG)
                .setColor("#55ADEE")
                .setDescription(tweetText)
                .setTimestamp(date);

            let additionalEmbeds: MessageEmbed[] = [];
            if (images.length > 0) {
                mainEmbed.setImage(images[0]);
                additionalEmbeds = images.slice(1).map((image, idx) => {
                    return new MessageEmbed().setTitle(`${idx + 2}/${images.length}`).setImage(image);
                });
            }

            return { embeds: [mainEmbed, ...additionalEmbeds] };
        });
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
