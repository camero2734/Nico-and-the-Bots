import { ActionRowBuilder, AttachmentBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { TweetApiUtilsData, TwitterOpenApi, TwitterOpenApiClient } from "twitter-openapi-typescript";
import secrets from "../../../Configuration/secrets";
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

const twitter = new TwitterOpenApi();
export class TwitterWatcher extends Watcher<TweetType> {
    type = "Twitter" as const;
    userid: string;
    #twitterClient: TwitterOpenApiClient;
    async fetchRecentItems(): Promise<Checked<TweetType>[]> {
        const client = await this.fetchTwitterClient();
        if (!this.userid) await this.fetchUserID();

        // Tweets, retweets
        const response = await client.getTweetApi().getUserTweets({ userId: this.userid, count: 5 });
        const tweets = response.data.data;

        const promises = tweets.map((tweet) => {
            const tweetType = tweet.tweet.legacy?.retweetedStatusResult ? 'Retweeted' : 'Tweeted';
            const referencedTweet = tweet.tweet.quotedStatusResult || tweet.tweet.legacy?.retweetedStatusResult;

            // Remove advertisements 🙄
            if (tweet.user.restId !== this.userid) return;

            const userResult = referencedTweet?.result?.typename === 'Tweet' ? referencedTweet.result.core?.userResults.result : undefined;

            const name = userResult?.typename === 'User' ? userResult.legacy.screenName : undefined;
            const tweeterUsername = tweetType === "Retweeted" && name ? name : this.handle
            const tweeterImage = userResult?.typename === 'User' ? userResult.legacy.profileImageUrlHttps : undefined;

            const url = `https://twitter.com/${tweeterUsername}/status/${tweet.tweet.restId}`;

            const videoURL = this.getVideoInTweet(tweet);

            const imageUrls = tweet.tweet.legacy?.extendedEntities?.media
                .filter((m) => m.type === "photo")
                .map((m) => m.mediaUrlHttps);

            const images = (videoURL ? [videoURL] : imageUrls) || [];

            const date = new Date(tweet.tweet.legacy?.createdAt || Date.now());

            return {
                uniqueIdentifier: tweet.tweet.restId,
                ping: true,
                _data: {
                    images,
                    date,
                    url,
                    tweeterUsername,
                    tweetType,
                    tweeterImage,
                    tweetText: tweet.tweet.legacy?.fullText || 'No text available.'
                }
            };
        })

        const checkedTweets = await Promise.all(promises);

        // Likes
        // TODO:

        return checkedTweets.filter(t => t) as Checked<TweetType>[];
    }

    async generateMessages(checkedItems: Checked<TweetType>[]): Promise<BaseMessageOptions[][]> {
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

            const msgs: BaseMessageOptions[] = [{ embeds: [mainEmbed], components: [actionRow] }];

            if (images.length > 0) {
                const firstIsVideo = images[0].includes(".mp4");
                if (!firstIsVideo) mainEmbed.setImage(images[0]);
                // TODO: Maybe set first frame as image for videos so the main msg isn't devoid of an image?

                const start = firstIsVideo ? 0 : 1;

                for (let i = start; i < images.length; i++) {
                    const image = images[i];

                    const embed = new EmbedBuilder().setTitle(`${i + 1}/${images.length}`);
                    const att = new AttachmentBuilder(image);

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
    getVideoInTweet({ tweet }: TweetApiUtilsData) {
        const result = tweet.legacy?.extendedEntities?.media?.find((m) => m.type === "video");
        const variants = result?.videoInfo?.variants
            .filter((v) => v.bitrate)
            .sort((v1, v2) => v2.bitrate! - v1.bitrate!);

        return variants?.[0]?.url;
    }

    async fetchUserID(): Promise<void> {
        const res = await this.#twitterClient.getUserApi().getUserByScreenName({ screenName: this.handle });
        if (!res.data.user) throw new Error("User not found or API unavailable");

        this.userid = res.data.user?.restId;
    }

    async fetchTwitterClient(): Promise<TwitterOpenApiClient> {
        if (this.#twitterClient) return this.#twitterClient;
        this.#twitterClient = await twitter.getClientFromCookies({
            ct0: secrets.apis.twitter.ct0,
            auth_token: secrets.apis.twitter.auth_token
        });
        return this.#twitterClient;
    }
}
/**
 * 
 * 

            
 */
