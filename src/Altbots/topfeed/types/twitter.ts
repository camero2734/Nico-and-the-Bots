import { MessageEmbed, MessageOptions } from "discord.js";
import F from "../../../Helpers/funcs";
import fetch from "node-fetch";
import secrets from "../../../Configuration/secrets";
import { Checked, Watcher } from "./base";

export interface ReferencedTweet {
    type: string;
    id: string;
}

export interface PublicMetrics {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
}

export interface Attachments {
    media_keys: string[];
}

export interface TweetData {
    id: string;
    referenced_tweets?: ReferencedTweet[];
    author_id: string;
    source: string;
    public_metrics: PublicMetrics;
    created_at: Date;
    text: string;
    in_reply_to_user_id: string;
    attachments?: Attachments;
}

export interface PublicMetrics {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
}

export interface TweetUser {
    username: string;
    profile_image_url: string;
    id: string;
    name: string;
}

export interface Tweet {
    attachments: Attachments[];
    source: string;
    author_id: string;
    id: string;
    text: string;
    created_at: Date;
    public_metrics: PublicMetrics[];
}

export interface Medium {
    media_key: string;
    type: string;
    url?: string;
    preview_image_url?: string;
}

export interface Includes {
    users: TweetUser[];
    tweets: Tweet[];
    media: Medium[];
}

type IDResponse = { id: string; name: string; username: string };

async function makeRequest<T, U = undefined>(endpoint: string): Promise<{ data: T; includes: U }> {
    const url = `https://api.twitter.com/2/${endpoint}`;
    const headers = {
        Authorization: `Bearer ${secrets.apis.twitter.bearer_token}`
    };
    const res = await fetch(url, { headers });
    return await res.json();
}

const _getID = (handle: string) => makeRequest<IDResponse>(`users/by/username/${handle}`);
const _getTweets = (id: string) => makeRequest<TweetData[], Includes>(`users/${id}/tweets?expansions=referenced_tweets.id,referenced_tweets.id.author_id,attachments.media_keys&tweet.fields=created_at,geo,public_metrics,in_reply_to_user_id,referenced_tweets,source&media.fields=preview_image_url,type,url&user.fields=profile_image_url,username&max_results=5`); // prettier-ignore

type TweetType = {
    images: string[];
    date: Date;
    url: string;
    tweetType: string;
    tweeterUsername: string;
    tweeterImage?: string;
    tweetText: string;
};

export class TwitterWatcher extends Watcher<TweetType> {
    type = "Twitter" as const;
    userid: string;
    async fetchRecentItems(): Promise<Checked<TweetType>[]> {
        if (!this.userid) await this.fetchUserID();

        const { data, includes } = await _getTweets(this.userid);

        return data.map((tweet) => {
            const images = (tweet.attachments?.media_keys || [])
                .map((mk) => includes.media.find((m) => m.media_key === mk))
                .map((m) => m?.url || m?.preview_image_url || "")
                .filter((m) => m);

            const date = new Date(tweet.created_at);

            const referencedTweet = tweet.referenced_tweets?.[0] || { type: undefined, id: undefined };
            const tweetType = referencedTweet.type ? F.titleCase(referencedTweet.type) : "Tweeted";

            const nameRes = includes.users.find((u) => u.id === referencedTweet.id);
            const tweeterUsername = tweetType === "Retweeted" && nameRes ? nameRes.username : this.handle;
            const tweeterImage = includes.users.find((u) => u.id === (nameRes?.id || this.userid))?.profile_image_url;

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
        const res = await _getID(this.handle);
        this.userid = res.data.id;
    }
}
/**
 * 
 * 

            
 */
