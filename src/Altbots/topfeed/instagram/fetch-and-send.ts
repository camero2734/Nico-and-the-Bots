import { ContainerBuilder } from "@discordjs/builders";
import { roleMention } from "@discordjs/formatters";
import { addHours } from "date-fns";
import { type APIComponentInContainer, ComponentType, MessageFlags } from "discord.js";
import { channelIDs, roles } from "../../../Configuration/config";
import F from "../../../Helpers/funcs";
import type { BotLogger } from "../../../Helpers/logging/evlog";
import { prisma } from "../../../Helpers/prisma-init";
import { keonsGuild } from "../topfeed";

type InstagramMedia = { url: string; type: "image" | "video" };
interface FormattedInstagramPost {
  code: string;
  url: string;
  caption: string;
  author: string;
  authorImage: string;
  media: InstagramMedia[];
  postedAt: Date;
}
type DataForUsername = {
  roleId: (typeof roles.topfeed.selectable)[keyof typeof roles.topfeed.selectable];
  channelId: (typeof channelIDs.topfeed)[keyof typeof channelIDs.topfeed];
};

export const usernamesToWatch = ["twentyonepilots", "tylerrjoseph", "joshuadun"] as const;
const usernameData: Record<(typeof usernamesToWatch)[number], DataForUsername> = {
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

const instagramEmojiId = "1380283905416106064";
export async function instaPostToComponents(post: FormattedInstagramPost, roleId: string) {
  // Compose author line
  const authorLine = `<:instagram:${instagramEmojiId}> **[${post.author}](https://instagram.com/${post.author})**`;

  const role = await keonsGuild.roles.fetch(roleId);
  if (!role) throw new Error(`Role with ID ${roleId} not found`);

  // Compose main post section
  const mainSection: APIComponentInContainer[] = [
    {
      type: ComponentType.Section,
      accessory: {
        type: ComponentType.Thumbnail,
        media: {
          url: post.authorImage,
        },
      },
      components: [
        {
          type: ComponentType.TextDisplay,
          content: authorLine,
        },
        {
          type: ComponentType.TextDisplay,
          content: post.caption,
        },
        {
          type: ComponentType.TextDisplay,
          content: `[View on Instagram](${post.url})`,
        },
      ],
    },
  ];

  // Compose media gallery section
  const mediaSection: APIComponentInContainer[] =
    post.media.length > 0
      ? [
          {
            type: ComponentType.Separator,
            divider: false,
            spacing: 1,
          },
          {
            type: ComponentType.MediaGallery,
            items: post.media
              .map((mediaItem) => ({
                media: { url: mediaItem.url },
              }))
              .slice(0, 10), // Limit to 10 items
          },
        ]
      : [];

  const footerSection: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content: `-# ${roleMention(roleId)} | Posted ${F.discordTimestamp(new Date(post.postedAt), "relative")}`,
    },
  ];

  // Build the container
  const container = new ContainerBuilder({
    components: [...mainSection, ...mediaSection, ...footerSection],
    accent_color: role.colors.primaryColor ?? undefined,
  });

  return container;
}

async function fetchIgForUsername(username: string, log: BotLogger): Promise<FormattedInstagramPost[]> {
  try {
    const responseText = await fetch(`https://www.instagram.com/${username}/embed/`).then((res) => res.text());
    const getSHandleRegex = /s\.handle\(\s*(\{[\s\S]*?\})\s*\)/g;
    const match = getSHandleRegex.exec(responseText);
    if (!match) throw new Error("Failed to parse the Instagram embed data.");
    // @ts-expect-error i ain't gonna type this whole thing
    // biome-ignore format: to preserve @ts-expect-error placement
    const contextJSON = JSON.parse(match[1]).require.find((x) => x[0] === "PolarisEmbedSimple").at(-1)[0].contextJSON;
    const mediaData = JSON.parse(contextJSON).context.graphql_media;

    const posts: FormattedInstagramPost[] = [];

    for (const media of mediaData) {
      const shortcodeMedia = media.shortcode_media;
      const formattedMedia: InstagramMedia[] = [];

      if (shortcodeMedia.__typename === "GraphImage") {
        formattedMedia.push({ url: shortcodeMedia.display_url, type: "image" });
      } else if (shortcodeMedia.__typename === "GraphVideo") {
        formattedMedia.push({ url: shortcodeMedia.video_url, type: "video" });
      } else if (shortcodeMedia.__typename === "GraphSidecar") {
        for (const edge of shortcodeMedia.edge_sidecar_to_children.edges) {
          const child = edge.node;
          if (child.__typename === "GraphImage") {
            formattedMedia.push({ url: child.display_url, type: "image" });
          } else if (child.__typename === "GraphVideo") {
            formattedMedia.push({ url: child.video_url, type: "video" });
          } else {
            throw new Error(`Unknown child media type: ${child.__typename}`);
          }
        }
      }

      posts.push({
        code: shortcodeMedia.shortcode,
        url: `https://www.instagram.com/p/${shortcodeMedia.shortcode}/`,
        caption: shortcodeMedia.edge_media_to_caption.edges[0]?.node.text || "",
        author: shortcodeMedia.owner.username,
        authorImage: shortcodeMedia.owner.profile_pic_url,
        media: formattedMedia.slice(0, 10), // Discord only supports up to 10 media items
        postedAt: new Date(shortcodeMedia.taken_at_timestamp * 1000),
      });
    }
    return posts;
  } catch (error) {
    const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
    if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

    const message = error instanceof Error ? error.message : "Unknown error fetching Instagram embed data";
    const existingErrors = ((log.getContext() as Record<string, unknown>).fetch_errors as string[] | undefined) || [];
    log.set({ fetch_errors: [...existingErrors, `${username}: ${message}`] });
    await testChan.send(`Error fetching Instagram embed data for ${username}: ${message}`);
    return [];
  }
}

export async function fetchInstagram(source: "scheduled" | "random", log: BotLogger) {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  log.set({ fetch_source: source });

  const postsSkipped: { code: string; author: string; reason: string }[] = [];

  for (const username of usernamesToWatch) {
    const formattedPosts = await fetchIgForUsername(username, log);
    for (const post of formattedPosts) {
      if (post.author !== username) {
        postsSkipped.push({ code: post.code, author: post.author, reason: "authorMismatch" });
        continue;
      }
      if (addHours(new Date(post.postedAt), 3) < new Date()) {
        postsSkipped.push({ code: post.code, author: post.author, reason: "oldPost" });
        continue;
      }
      await sendInstagramPost(post, log);
    }
  }

  if (postsSkipped.length > 0) {
    const existing =
      ((log.getContext() as Record<string, unknown>).posts_skipped as typeof postsSkipped | undefined) || [];
    log.set({ posts_skipped: [...existing, ...postsSkipped] });
  }
}

async function sendInstagramPost(post: FormattedInstagramPost, log: BotLogger) {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  const postsSkipped: { code: string; author: string; reason: string }[] = [];

  if (!usernamesToWatch.includes(post.author as (typeof usernamesToWatch)[number])) {
    postsSkipped.push({ code: post.code, author: post.author, reason: "notInWatchlist" });
  }

  const existing = await prisma.topfeedPost.findFirst({
    where: {
      type: "Instagram",
      handle: post.author,
      id: post.code,
    },
  });

  if (existing) {
    postsSkipped.push({ code: post.code, author: post.author, reason: "alreadyExists" });
  }

  if (postsSkipped.length > 0) {
    const existingSkipped =
      ((log.getContext() as Record<string, unknown>).posts_skipped as typeof postsSkipped | undefined) || [];
    log.set({ posts_skipped: [...existingSkipped, ...postsSkipped] });
    return;
  }

  const { roleId, channelId } = usernameData[post.author as (typeof usernamesToWatch)[number]];
  const components = await instaPostToComponents(post, roleId);

  const channel = await keonsGuild.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or is not text-based");
  }

  await prisma.topfeedPost.create({
    data: {
      id: post.code,
      type: "Instagram",
      handle: post.author,
      data: { ...post },
    },
  });

  const m = await channel.send({
    components: [components],
    flags: MessageFlags.IsComponentsV2,
  });

  if (m.crosspostable) await m.crosspost();
  const existingSent =
    ((log.getContext() as Record<string, unknown>).posts_sent as { code: string; author: string }[] | undefined) || [];
  log.set({ posts_sent: [...existingSent, { code: post.code, author: post.author }] });
}
