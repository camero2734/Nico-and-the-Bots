import { ITopfeedPost, ITopfeedRunOutput, ITopfeedSourceInput, TopfeedSource } from "..";
import { TweetV2, TwitterApi, TwitterApiReadOnly, TwitterV2IncludesHelper } from "twitter-api-v2";
import secrets from "../../../Configuration/secrets";

interface ITwitterSourceInput extends ITopfeedSourceInput {
    handle: string;
}

const twitter = new TwitterApi(secrets.apis.twitter.bearer_token).readOnly;

class TwitterSource extends TopfeedSource {
    type: "Twitter";

    constructor(opts: ITwitterSourceInput) {
        super(opts);
    }

    async run(): Promise<ITopfeedRunOutput> {
        // Step 1: Fetch from Twitter API
        const { tweets, includes } = await twitter.v2.userTimeline(this.displayName, {
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

        const ids = tweets.map((tweet) => this.genId(tweet.id));

        // Step 2: Figure out which posts are new
        const newIds = await this.cullIds(ids);
        if (newIds.size === 0) return { posts: [] };

        const newTweets = tweets.filter((tweet) => newIds.has(this.genId(tweet.id)));

        // Step 3: Generate post data
        const posts = newTweets.map((tweet) => this.generatePost(tweet, includes));

        return { posts };
    }

    generatePost(tweet: TweetV2, includes: TwitterV2IncludesHelper): ITopfeedPost {
        // TODO: Generate messages
        return {
            id: this.genId(tweet.id),
            name: `New Twitter Post from ${this.displayName}`,
            messages: []
        };
    }
}
