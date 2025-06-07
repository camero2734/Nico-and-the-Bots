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
import { z } from "zod";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import topfeedBot from "../topfeed";
import { TwitterOpenApi, type TwitterOpenApiClient } from "twitter-openapi-typescript";

const logger = (...args: unknown[]) => console.log("[TW:Fetch]", ...args);

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

const videoInfoSchema = z.object({
  aspect_ratio: z.tuple([z.number(), z.number()]),
  duration_millis: z.number().optional(),
  variants: z.array(
    z.object({
      content_type: z.string(),
      url: z.string().url(),
      bitrate: z.number().optional(),
    }),
  ),
});

const mediaSchema = z.object({
  type: z.enum(["photo", "video"]),
  url: z.string().url(),
  media_url_https: z.string().url(),
  video_info: videoInfoSchema.optional(),
});

const userSchema = z.object({
  userName: z.string(),
  name: z.string(),
  profilePicture: z.string().optional().nullable(),
  coverPicture: z.string().optional().nullable(),
});

const quotedOrRetweetedSchema = z
  .object({
    author: userSchema,
    url: z.string().url(),
    text: z.string(),
  })
  .partial();

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  url: z.string().url(),
  author: userSchema,
  quoted_tweet: quotedOrRetweetedSchema.nullable(),
  retweeted_tweet: quotedOrRetweetedSchema.nullable(),
  createdAt: z.string(),
  extendedEntities: z
    .object({
      media: z.array(mediaSchema),
    })
    .partial()
    .nullable(),
});
type Tweet = z.infer<typeof tweetSchema>;

const responseSchema = z.object({
  tweets: z.array(tweetSchema),
});

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

const twitter = new TwitterOpenApi();
let twitterClient: TwitterOpenApiClient | null = null;

async function fetchTwitterRealApi(query: string) {
  const client =
    twitterClient ||
    (await twitter.getClientFromCookies({
      ct0: secrets.apis.twitter.ct0,
      auth_token: secrets.apis.twitter.auth_token,
    }));
  twitterClient = client;

  const result = await client.getTweetApi().getSearchTimeline({
    product: "Latest",
    rawQuery: query,
    count: 5,
  });
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

  return { fetchedAt, parsedResult: { tweets } };
}

async function fetchTwitterUnofficialApi(query: string) {
  if (!secrets.twitterAlternateApiKey) {
    throw new Error("Unable to handle webhook: MISSING_TWITTER_API_KEY");
  }

  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.append("query", query);
  url.searchParams.append("queryType", "Latest");

  logger(`Fetching tweets with query: ${url.toString()}`);

  const options = {
    method: "GET",
    headers: {
      "X-API-Key": secrets.twitterAlternateApiKey,
      "Content-Type": "application/json",
    },
  };

  const result = await fetch(url.toString(), options).then((r) => r.json());
  const fetchedAt = Date.now();
  const parsedResult = responseSchema.parse(result);

  return { fetchedAt, parsedResult };
}

export async function fetchTwitter(source: "webhook" | "scheduled", _sinceTs?: number) {
  const sinceTs = _sinceTs || Math.floor(subMinutes(new Date(), 5).getTime() / 1000);
  const queryUsernames = usernamesToWatch.map((username) => `from:${username}`).join(" OR ");
  const query = `(${queryUsernames}) since_time:${sinceTs}`;

  const [real, unofficial] = await Promise.allSettled([fetchTwitterRealApi(query), fetchTwitterUnofficialApi(query)]);

  if (real.status === "rejected" && unofficial.status === "rejected") {
    logger("Both Twitter API fetches failed. No tweets to process.");
    return;
  }

  const toIterate = [
    { result: real, dataSource: "Real API" },
    { result: unofficial, dataSource: "Unofficial API" },
  ];

  const testChannel = await topfeedBot.guild.channels.fetch(channelIDs.bottest).catch(() => null);
  for (const { result, dataSource } of toIterate) {
    const fulfilled = result.status === "fulfilled" ? result.value : null;
    if (!fulfilled) {
      logger(`Skipping ${dataSource} fetch due to error: ${result.status === "rejected" ? result.reason : "No data"}`);
      continue;
    }

    const { fetchedAt, parsedResult } = fulfilled;

    if (testChannel?.isSendable()) {
      await testChannel.send(`[${source}/${dataSource}] Fetched tweets with query: ${query}`).catch(() => null);

      const urls = parsedResult.tweets.map((tweet) => tweet.url).join("\n");
      await testChannel.send(`Found ${parsedResult.tweets.length} tweet(s)\n${urls}`).catch(() => null);
    }

    // Sort tweets from oldest to newest so we process them in the order they were posted
    const sortedTweets = parsedResult.tweets.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const tweet of sortedTweets) {
      const tweetName = tweet.author.userName as (typeof usernamesToWatch)[number];
      if (!usernamesToWatch.includes(tweetName)) {
        logger(`Skipping tweet from unknown user: ${tweetName}`);
        if (testChannel?.isSendable()) {
          await testChannel
            .send(`${userMention(userIDs.me)} Skipping tweet from unknown user: ${tweetName}`)
            .catch(console.error);
        }
        continue;
      }

      const existing = await prisma.topfeedPost.findFirst({
        where: {
          type: "Twitter",
          handle: tweetName,
          id: tweet.id,
        },
      });

      if (existing) {
        logger(`Tweet ${tweet.id} from ${tweetName} already exists in the database.`);
        continue; // Skip if tweet already exists
      }

      logger(`Processing tweet ${tweet.id} from ${tweetName}`);
      logger(JSON.stringify(tweet, null, 2));

      const { roleId, channelId } = usernameData[tweetName];
      const components = await tweetToComponents(tweet, roleId);

      const channel = await topfeedBot.guild.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error("Channel not found or is not text-based");
      }

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
    }
  }
}
