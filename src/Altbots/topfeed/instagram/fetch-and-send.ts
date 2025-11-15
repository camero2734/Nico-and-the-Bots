import { addHours } from "date-fns";
import {
  type APIComponentInContainer,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  roleMention,
  userMention,
} from "discord.js";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import F from "../../../Helpers/funcs";
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

const logger = (...args: unknown[]) => console.log("[IG:Fetch]", ...args);

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
    accent_color: role.color,
  });

  return container;
}

async function fetchIgForUsername(username: string): Promise<FormattedInstagramPost[]> {
  try {
    const responseText = await fetch(`https://www.instagram.com/${username}/embed/`).then((res) => res.text());
    const getSHandleRegex = /s\.handle\(\s*(\{[\s\S]*?\})\s*\)/g;
    const match = getSHandleRegex.exec(responseText);
    if (!match) throw new Error("Failed to parse the Instagram embed data.");
    // @ts-ignore i ain't gonna type this whole thing
    // biome-ignore format: to preserve @ts-ignore placement
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
    console.error(error);
    await testChan.send(`${userMention(userIDs.me)} Error fetching Instagram embed data for ${username}: ${message}`);
    return [];
  }
}

export async function fetchInstagram(source: "scheduled" | "random") {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  await testChan.send(`[${source}] Fetching recent IG posts`).catch(console.error);

  try {
    for (const username of usernamesToWatch) {
      const formattedPosts = await fetchIgForUsername(username);
      for (const post of formattedPosts) {
        // Sometimes other people's posts show up in the embed, skip those
        if (post.author !== username) {
          logger(
            `Skipping IG post ${post.code} from ${post.author} as it does not match watched username ${username}.`,
          );
        }
        // Only send if the post is new (sent within the last 3 hours)
        if (addHours(new Date(post.postedAt), 3) < new Date()) {
          logger(`Skipping IG post ${post.code} from ${post.author} as it is old.`);
          continue;
        }
        await sendInstagramPost(post);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during Instagram feed fetch";
    console.error(error);
    await testChan.send(`${userMention(userIDs.me)} Error fetching Instagram feed: ${message}`);
  }
}

async function sendInstagramPost(post: FormattedInstagramPost) {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  if (!usernamesToWatch.includes(post.author as (typeof usernamesToWatch)[number])) {
    logger(`Skipping post from ${post.author} as they are not in the watchlist.`);
    return;
  }

  const existing = await prisma.topfeedPost.findFirst({
    where: {
      type: "Instagram",
      handle: post.author,
      id: post.code,
    },
  });

  if (existing) {
    logger(`IG post ${post.code} from ${post.author} already exists in the database.`);
    return; // Skip if post already exists
  }

  if (addHours(new Date(post.postedAt), 3) < new Date()) {
    logger(`Skipping IG post ${post.code} from ${post.author} as it is old.`);
    await testChan.send(`Skipping IG post ${post.url} from ${post.author} as it is old.`).catch(console.error);
    return;
  }

  logger(`Processing IG post ${post.code} from ${post.author}`);
  logger(JSON.stringify(post, null, 2));

  await testChan.send(`Processing IG post ${post.url} from ${post.author}`).catch(console.error);

  const { roleId, channelId } = usernameData[post.author as (typeof usernamesToWatch)[number]];
  void channelId;
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
}
