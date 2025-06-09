import {
  type APIComponentInContainer,
  type APIMediaGalleryItem,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  roleMention,
} from "discord.js";
import F from "../../../Helpers/funcs";
import topfeedBot from "../topfeed";

import { type Tweet, twitterEmojiId } from "./constants";

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
