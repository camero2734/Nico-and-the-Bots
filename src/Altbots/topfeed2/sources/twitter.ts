import { ITopfeedPost, ITopfeedRunOutput, ITopfeedSourceInput, TopfeedError, TopfeedSource } from "../source";
import { TweetV2, TwitterApi, TwitterApiReadOnly, TwitterV2IncludesHelper } from "twitter-api-v2";
import secrets from "../../../Configuration/secrets";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Attachment, BaseMessageOptions } from "discord.js";
import { emojiIDs } from "../../../Configuration/config";

interface ITwitterSourceInput extends ITopfeedSourceInput {
    handle: string;
}

const twitter = new TwitterApi('').readOnly;

export class TwitterSource extends TopfeedSource {
    type = "Twitter";
    handle: string;

    constructor(opts: ITwitterSourceInput) {
        super(opts);
        this.handle = opts.handle;
    }

    async run(): Promise<ITopfeedRunOutput> {
        // Step 1: Fetch from Twitter API
        const { data } = (await twitter.v2.userByUsername(this.handle)) || {};
        const { tweets, includes } = await twitter.v2.userTimeline(data?.id, {
            expansions: [
                "referenced_tweets.id",
                "referenced_tweets.id.author_id",
                "attachments.media_keys",
                "in_reply_to_user_id"
            ],
            "tweet.fields": ["author_id", "created_at", "in_reply_to_user_id", "referenced_tweets"],
            "media.fields": ["preview_image_url", "type", "url"],
            "user.fields": ["profile_image_url", "username"],
            max_results: 5
        });

        const ids = tweets.map((tweet) => this.genId(tweet.id));

        // Step 2: Figure out which posts are new
        const newIds = await this.cullIds(ids);
        if (newIds.size === 0) return { posts: [] };

        const newTweets = tweets.filter((tweet) => newIds.has(this.genId(tweet.id)));

        // Step 3: Generate post data
        const promisedPosts = newTweets.map((tweet) => this.generatePost(tweet, includes));
        const posts = await Promise.all(promisedPosts);

        return { posts };
    }

    async generatePost(tweet: TweetV2, includes: TwitterV2IncludesHelper): Promise<ITopfeedPost> {
        const author = includes.userById(tweet.author_id as string);
        if (!author) throw new TopfeedError("Unable to find author");

        const isRetweet = tweet.referenced_tweets?.[0].type === "retweeted";
        const tweeterName = isRetweet
            ? await this.#getUserNameFromTweet(tweet.referenced_tweets?.[0].id)
            : author.username;

        const inReplyTo = includes.userById(tweet.in_reply_to_user_id as string);
        const repliedToSelf = inReplyTo?.username === this.handle;

        const title = (() => {
            if (inReplyTo && !repliedToSelf) return `${this.handle} replied to ${inReplyTo.username}`;
            if (isRetweet) return `${this.handle} retweeted ${tweeterName}'s Tweet`;
            return `${this.handle} tweeted`;
        })();

        const description = tweet.text;

        const images: string[] = (tweet.attachments?.media_keys || [])
            .map((key) => includes.medias(tweet).find((media) => media.media_key === key))
            .map((media) => media?.url || media?.preview_image_url)
            .filter((m): m is string => !!m);

        const url = `https://twitter.com/${tweeterName}/status/${tweet.id}`;

        return {
            id: this.genId(tweet.id),
            name: `New Twitter Post from ${this.displayName}`,
            messages: this.generateMessages(title, description, url, images)
        };
    }

    generateMessages(title: string, description: string, url: string, imageUrls: string[]): BaseMessageOptions[] {
        const firstMessage = this.embedToMsg(
            new EmbedBuilder() //
                .setTitle(title)
                .setDescription(description)
                .setImage(imageUrls[0])
                .setColor(Colors.Blue)
        );

        const tweetButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("View Tweet")
            .setURL(url)
            .setEmoji({ id: emojiIDs.twitter });

        firstMessage.components = [new ActionRowBuilder<ButtonBuilder>().setComponents([tweetButton])];

        const restMessages = imageUrls
            .splice(1)
            .map((img, idx) => {
                return new EmbedBuilder()
                    .setTitle(`${idx + 2} / ${imageUrls.length}`)
                    .setColor(Colors.Blue)
                    .setImage(img);
            })
            .map(this.embedToMsg);

        return [firstMessage, ...restMessages];
    }

    async #getUserNameFromTweet(tweetId: string | undefined): Promise<string | undefined> {
        if (!tweetId) return;

        const { data, includes } =
            (await twitter.v2.singleTweet(tweetId, { expansions: ["author_id"], "user.fields": ["username"] })) || {};
        return includes?.users?.find((u) => u.id === data.author_id)?.username;
    }
}
