import { Effect } from "effect";
import { TwitterApiClient } from "./client";
import type { Response, Tweet } from "./schemas";

export const fetchTwitterOfficialApi = (query: string) =>
  Effect.gen(function* () {
    const client = yield* TwitterApiClient;

    yield* Effect.log(`Fetching tweets with query: ${query}`);

    const result = yield* Effect.tryPromise(() =>
      client.getTweetApi().getSearchTimeline({
        product: "Latest",
        rawQuery: query,
        count: 5,
      }),
    );

    const fetchedAt = Date.now();
    const tweets: Tweet[] = result.data.data.map((tweet) => {
      return {
        id: tweet.tweet.restId,
        text: tweet.tweet.legacy?.fullText || "",
        url: `https://x.com/${tweet.user.legacy.screenName}/status/${tweet.tweet.restId}`,
        quoted_tweet: null,
        retweeted_tweet: null,
        author: {
          userName: tweet.user.legacy.screenName,
          name: tweet.user.legacy.name,
          profilePicture: tweet.user.legacy.profileImageUrlHttps || null,
          coverPicture: tweet.user.legacy.profileBannerUrl || null,
        },
        createdAt: tweet.tweet.legacy?.createdAt
          ? new Date(tweet.tweet.legacy.createdAt).toISOString()
          : new Date().toISOString(),
        extendedEntities: {
          media: tweet.tweet.legacy?.extendedEntities?.media.map((m) => ({
            type: m.type === "video" ? "video" : "photo",
            url: m.mediaUrlHttps,
            media_url_https: m.mediaUrlHttps,
            video_info: m.videoInfo
              ? {
                  aspect_ratio: [m.videoInfo.aspectRatio[0], m.videoInfo.aspectRatio[1]],
                  duration_millis: m.videoInfo.durationMillis,
                  variants: m.videoInfo.variants.map((v) => ({
                    content_type: v.contentType,
                    url: v.url,
                    bitrate: v.bitrate,
                  })),
                }
              : undefined,
          })),
        },
      };
    });

    return { fetchedAt, query, parsedResult: { tweets } } satisfies Response;
  });
