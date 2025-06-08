import { subMinutes } from "date-fns";
import {
  type APIComponentInContainer,
  type APIMediaGalleryItem,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  roleMention,
  userMention,
} from "discord.js";
import { Data, Duration, Effect, Either, Schedule } from "effect";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import topfeedBot from "../topfeed";
import { TwitterApiClient } from "./client";
import { fetchTwitterOfficialApi } from "./fetch-official-api";
import { fetchTwitterUnofficialApi } from "./fetch-unofficial-api";
import type { Response, Tweet } from "./schemas";

class TwitterNoNewTweetsFound extends Data.TaggedError("TwitterNoNewTweetsFound") {}

export const usernamesToWatch = ["camero_2734", "twentyonepilots", "blurryface", "tylerrjoseph", "joshuadun"] as const;

type DataForUsername = {
  roleId: (typeof roles.topfeed.selectable)[keyof typeof roles.topfeed.selectable];
  channelId: (typeof channelIDs.topfeed)[keyof typeof channelIDs.topfeed];
};

const usernameData: Record<(typeof usernamesToWatch)[number], DataForUsername> = {
  camero_2734: {
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    roleId: "572568489320120353" as any,
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    channelId: channelIDs.bottest as any,
  },
  blurryface: {
    roleId: roles.topfeed.selectable.dmaorg,
    channelId: channelIDs.topfeed.dmaorg,
  },
  twentyonepilots: {
    roleId: roles.topfeed.selectable.band,
    channelId: channelIDs.topfeed.band,
  },
  tylerrjoseph: {
    roleId: roles.topfeed.selectable.tyler,
    channelId: channelIDs.topfeed.tyler,
  },
  joshuadun: {
    roleId: roles.topfeed.selectable.josh,
    channelId: channelIDs.topfeed.josh,
  },
};

const twitterEmojiId = "1380283149489143929";
export async function tweetToComponents(tweet: Tweet, roleId: string) {
  const media = tweet.extendedEntities?.media || [];

  const role = await topfeedBot.guild.roles.fetch(roleId);
  if (!role) throw new Error(`Role with ID ${roleId} not found`);

  const mediaItems: APIMediaGalleryItem[] = media
    .map((item) => {
      if (item.type === "video" && item.video_info) {
        const highestBitrateVariant = item.video_info.variants
          .filter((variant) => variant.content_type.startsWith("video/"))
          .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

        if (!highestBitrateVariant) return undefined;

        return {
          media: {
            url: highestBitrateVariant.url,
          },
        };
      }
      if (item.type === "photo") {
        return {
          media: {
            url: item.media_url_https,
          },
        };
      }
      return undefined;
    })
    .filter((item): item is APIMediaGalleryItem => item !== undefined);

  // Compose author line
  const authorLine = `<:twitter:${twitterEmojiId}> **[${tweet.author.name} (@${tweet.author.userName})](https://x.com/${tweet.author.userName})**`;

  // Compose retweet/quote info
  let contextSection: APIComponentInContainer[] = [];
  if (tweet.quoted_tweet?.url) {
    contextSection = [
      {
        type: ComponentType.Separator,
        divider: true,
        spacing: 1,
      },
      {
        type: ComponentType.Section,
        accessory: {
          type: ComponentType.Button,
          label: "View Quote",
          url: tweet.quoted_tweet.url,
          style: ButtonStyle.Link,
        },
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `🔁 Quoting [${tweet.quoted_tweet.author?.name} (@${tweet.quoted_tweet.author?.userName})](${tweet.quoted_tweet.url})`,
          },
          {
            type: ComponentType.TextDisplay,
            content: tweet.quoted_tweet.text || "",
          },
        ],
      },
    ];
  } else if (tweet.retweeted_tweet?.url) {
    contextSection = [
      {
        type: ComponentType.Separator,
        divider: true,
        spacing: 1,
      },
      {
        type: ComponentType.Section,
        accessory: {
          type: ComponentType.Button,
          label: "View Retweet",
          url: tweet.retweeted_tweet.url,
          style: ButtonStyle.Link,
        },
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `🔁 Retweet from [${tweet.retweeted_tweet.author?.name} (@${tweet.retweeted_tweet.author?.userName})](${tweet.retweeted_tweet.url})`,
          },
          {
            type: ComponentType.TextDisplay,
            content: tweet.retweeted_tweet.text || "",
          },
        ],
      },
    ];
  }

  // Compose main tweet section
  const mainSection: APIComponentInContainer[] = [
    {
      type: ComponentType.Section,
      accessory: {
        type: ComponentType.Thumbnail,
        media: {
          url:
            tweet.author.profilePicture ||
            "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
        },
      },
      components: [
        {
          type: ComponentType.TextDisplay,
          content: authorLine,
        },
        {
          type: ComponentType.TextDisplay,
          content: tweet.text,
        },
        {
          type: ComponentType.TextDisplay,
          content: `[View on Twitter](${tweet.url})`,
        },
      ],
    },
  ];

  // Compose media gallery section if there are media items
  const mediaSection: APIComponentInContainer[] =
    mediaItems.length > 0
      ? [
          {
            type: ComponentType.Separator,
            divider: false,
            spacing: 1,
          },
          {
            type: ComponentType.MediaGallery,
            items: mediaItems,
          },
        ]
      : [];

  const footerSection: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content: `-# ${roleMention(roleId)} | Posted ${F.discordTimestamp(new Date(tweet.createdAt), "relative")}`,
    },
  ];

  // Build the container
  const container = new ContainerBuilder({
    components: [...mainSection, ...mediaSection, ...contextSection, ...footerSection],
    accent_color: role.color,
  });

  return container;
}

export const handleTwitterResponse = (
  response: Response,
  source: "scheduled" | "webhook",
  dataSource: "real" | "unofficial",
) =>
  Effect.gen(function* () {
    const { fetchedAt, query, parsedResult } = response;

    const testChannel = yield* Effect.tryPromise(() => topfeedBot.guild.channels.fetch(channelIDs.bottest));

    if (testChannel?.isSendable()) {
      yield* Effect.tryPromise(async () => {
        await testChannel.send(`[${source}/${dataSource}] Fetched tweets with query: ${query}`).catch(() => null);

        const urls = parsedResult.tweets.map((tweet) => tweet.url).join("\n");
        await testChannel.send(`Found ${parsedResult.tweets.length} tweet(s)\n${urls}`).catch(() => null);
      }).pipe(Effect.either);
    }

    // Sort tweets from oldest to newest so we process them in the order they were posted
    const sortedTweets = parsedResult.tweets.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let foundNewTweets = false;
    for (const tweet of sortedTweets) {
      const tweetName = tweet.author.userName as (typeof usernamesToWatch)[number];
      if (!usernamesToWatch.includes(tweetName)) {
        yield* Effect.log(`Skipping tweet from unknown user: ${tweetName}`);

        if (testChannel?.isSendable()) {
          yield* Effect.tryPromise(async () =>
            testChannel
              .send(`${userMention(userIDs.me)} Skipping tweet from unknown user: ${tweetName}`)
              .catch(console.error),
          ).pipe(Effect.either);
        }
        continue;
      }

      const existing = yield* Effect.tryPromise(() =>
        prisma.topfeedPost.findFirst({
          where: {
            type: "Twitter",
            handle: tweetName,
            id: tweet.id,
          },
        }),
      );

      if (existing) {
        yield* Effect.log(`Tweet ${tweet.id} from ${tweetName} already exists in the database.`);
        continue; // Skip if tweet already exists
      }

      foundNewTweets = true;

      yield* Effect.log(`Processing tweet ${tweet.id} from ${tweetName}`);
      yield* Effect.log(JSON.stringify(tweet, null, 2));

      const { roleId, channelId } = usernameData[tweetName];
      const components = yield* Effect.tryPromise(() => tweetToComponents(tweet, roleId));

      const channel = yield* Effect.tryPromise(() => topfeedBot.guild.channels.fetch(channelId));
      if (!channel || !channel.isTextBased()) {
        throw new Error("Channel not found or is not text-based");
      }

      yield* Effect.tryPromise(async () => {
        await prisma.topfeedPost.create({
          data: {
            id: tweet.id,
            type: "Twitter",
            handle: tweetName,
            data: {
              userName: tweet.author.userName,
              name: tweet.author.name,
              profilePicture: tweet.author.profilePicture || null,
              coverPicture: tweet.author.coverPicture || null,
              text: tweet.text,
              url: tweet.url,
              createdAt: new Date(tweet.createdAt),
              extendedEntities: tweet.extendedEntities ? tweet.extendedEntities.media : [],
            },
          },
        });

        const m = await channel.send({
          components: [components],
          flags: MessageFlags.IsComponentsV2,
        });

        if (m.crosspostable) await m.crosspost();

        if (testChannel?.isSendable()) {
          await testChannel
            .send(
              `[${dataSource}] Processed tweet ${tweet.id} from ${tweetName} in <#${channelId}>. Was delayed by: ${fetchedAt - new Date(tweet.createdAt).getTime()}ms`,
            )
            .catch(console.error);
        }
      });
    }

    return yield* Effect.succeed(foundNewTweets);
  });

export const fetchTwitter = (source: "scheduled" | "webhook", _sinceTs?: number) =>
  Effect.gen(function* () {
    const sinceTs = _sinceTs || Math.floor(subMinutes(new Date(), 5).getTime() / 1000);
    const queryUsernames = usernamesToWatch.map((username) => `from:${username}`).join(" OR ");
    const query = `(${queryUsernames}) since_time:${sinceTs}`;

    const values = yield* Effect.all(
      [
        fetchTwitterOfficialApi(query)
          .pipe(Effect.tapError(Effect.logError))
          .pipe(Effect.andThen((r) => handleTwitterResponse(r, source, "real"))),
        fetchTwitterUnofficialApi(query)
          .pipe(Effect.tapError(Effect.logError))
          .pipe(Effect.andThen((r) => handleTwitterResponse(r, source, "unofficial"))),
      ],
      {
        mode: "either",
        concurrency: "unbounded",
      },
    );

    const eitherFoundNewTweets = values.some((value) => Either.getOrElse(value, () => false));

    if (eitherFoundNewTweets) {
      yield* Effect.succeed(true);
    } else {
      yield* Effect.fail(new TwitterNoNewTweetsFound());
    }
  })
    .pipe(
      Effect.retry(
        Schedule.intersect(
          // Exponential backoff with max retries
          Schedule.exponential(Duration.millis(200), 2),
          Schedule.recurs(_sinceTs ? 5 : 0),
        ),
      ),
    )
    .pipe(Effect.provide(TwitterApiClient.Default));
