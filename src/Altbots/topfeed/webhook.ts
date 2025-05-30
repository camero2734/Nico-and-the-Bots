import { subMinutes } from "date-fns";
import secrets from "../../Configuration/secrets";

const usernamesToWatch = ['camero2734', 'twentyonepilots'];

import { APIComponentInContainer, APIMediaGalleryItem, ButtonStyle, ComponentType, ContainerBuilder, MessageFlags } from "discord.js";
import { z } from "zod";
import { channelIDs } from "../../Configuration/config";
import topfeedBot from "./topfeed";

const videoInfoSchema = z.object({
  aspect_ratio: z.tuple([z.number(), z.number()]),
  duration_millis: z.number().optional(),
  variants: z.array(
    z.object({
      content_type: z.string(),
      url: z.string().url(),
      bitrate: z.number().optional(),
    })
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
  profilePicture: z.string().url().optional(),
  coverPicture: z.string().url().optional(),
});

const quotedOrRetweetedSchema = z
  .object({
    author: userSchema,
    url: z.string().url(),
    text: z.string(),
  })
  .partial();

const tweetSchema = z.object({
  text: z.string(),
  url: z.string().url(),
  author: userSchema,
  quoted_tweet: quotedOrRetweetedSchema.nullable(),
  retweeted_tweet: quotedOrRetweetedSchema.nullable(),
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

export async function tweetToComponents(tweet: Tweet) {
  const media = tweet.extendedEntities?.media || [];

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
      } else if (item.type === "photo") {
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
  const authorLine = `**[${tweet.author.name} (@${tweet.author.userName})](https://x.com/${tweet.author.userName})**`;

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

  // Build the container
  const container = new ContainerBuilder({
    components: [
      ...mainSection,
      ...mediaSection,
      ...contextSection,
    ],
  });

  return container;
}

export async function handleWebhook() {
  if (!secrets.twitterAlternateApiKey) {
    throw new Error("Unable to handle webhook: MISSING_TWITTER_API_KEY");
  }
  const sinceTs = Math.floor(subMinutes(new Date(), 5).getTime() / 1000);

  const query = usernamesToWatch.map(username => `from:${username}`).join(' OR ');

  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.append('query', `(${query}) since_time:${sinceTs})}`);
  url.searchParams.append('queryType', 'Latest');

  console.log(`Fetching tweets with query: ${url.toString()}`);

  const options = {
    method: 'GET',
    headers: {'X-API-Key': secrets.twitterAlternateApiKey, 'Content-Type': 'application/json'},
  };

  const result = await fetch(url.toString(), options).then(r => r.json());
  const parsedResult = responseSchema.parse(result);

  console.log(parsedResult);

  const channel = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or is not text-based");
  }

  for (const tweet of parsedResult.tweets) {
    const components = await tweetToComponents(tweet);
    await channel.send({
      components: [components],
      flags: MessageFlags.IsComponentsV2,
    });
  }

}