import { MessageEmbed } from "discord.js";
import F from "helpers/funcs";
import fetch from "node-fetch";
import * as secrets from "../../../configuration/secrets.json";
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

export class TwitterWatcher extends Watcher<TweetData> {
    type = "Twitter" as const;
    userid: string;
    override async fetchRecentItems(): Promise<Checked<TweetData>[]> {
        if (!this.userid) await this.fetchUserID();

        const { data, includes } = await _getTweets(this.userid);

        return data.map((tweet) => {
            const images = (tweet.attachments?.media_keys || [])
                .map((mk) => includes.media.find((m) => m.media_key === mk))
                .map((m) => m?.url || m?.preview_image_url || "")
                .filter((m) => m);

            console.log(this.userid, includes.users, /USERS/);

            const date = new Date(tweet.created_at);

            const referencedTweet = tweet.referenced_tweets?.[0] || { type: undefined, id: undefined };
            const tweetType = referencedTweet.type ? F.titleCase(referencedTweet.type) : "Tweeted";

            let title = `New Tweet from @${this.handle}`;
            const nameRes = includes.users.find((u) => u.id === referencedTweet.id);
            if (tweetType !== "Tweeted" && nameRes) {
                title = `@${this.handle} ${tweetType} @${nameRes.username}`;
            }

            const tweeterUsername = tweetType === "Retweeted" && nameRes ? nameRes : this.handle;

            const tweeterImage =
                includes.users.find((u) => u.id === (nameRes?.id || this.userid))?.profile_image_url || "";

            const mainEmbed = new MessageEmbed()
                .setAuthor(
                    title,
                    "https://assets.stickpng.com/images/580b57fcd9996e24bc43c53e.png",
                    `https://twitter.com/${tweeterUsername}/status/${tweet.id}`
                ) // prettier-ignore
                .setThumbnail(tweeterImage)
                .setColor("55ADEE")
                .setDescription(tweet.text)
                .setTimestamp(date);

            let additionalEmbeds: MessageEmbed[] = [];
            if (images.length > 0) {
                mainEmbed.setImage(images[0]);
                additionalEmbeds = images.slice(1).map((image, idx) => {
                    return new MessageEmbed().setTitle(`${idx + 2}/${images.length}`).setImage(image);
                });
            }

            return {
                uniqueIdentifier: tweet.id,
                msg: { embeds: [mainEmbed, ...additionalEmbeds] },
                _data: tweet
            };
        });
    }

    async fetchUserID(): Promise<void> {
        const res = await _getID(this.handle);
        this.userid = res.data.id;
    }
}
