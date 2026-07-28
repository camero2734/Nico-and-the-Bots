import { ContainerBuilder } from "@discordjs/builders";
import { roleMention } from "@discordjs/formatters";
import { addHours } from "date-fns";
import { type APIComponentInContainer, ComponentType, MessageFlags } from "discord.js";
import { channelIDs, roles } from "../../../Configuration/config";
import F from "../../../Helpers/funcs";
import { addElement, type WideEvent } from "../../../Helpers/logging/wide-event";
import { prisma } from "../../../Helpers/prisma-init";
import { keonsGuild } from "../topfeed";

type InstagramMedia = { url: string; type: "image" | "video" };
export interface FormattedInstagramPost {
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
export const usernameData: Record<(typeof usernamesToWatch)[number], DataForUsername> = {
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
          content: post.caption || "*No caption*",
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

// The profile embed omits video_url for carousel videos, but the post's own embed page has them
async function fetchVideoUrlsFromPostEmbed(shortcode: string): Promise<Map<string, string>> {
  const videoUrls = new Map<string, string>();

  try {
    const responseText = await fetch(`https://www.instagram.com/p/${shortcode}/embed/`).then((res) => res.text());
    const match = /s\.handle\(\s*(\{[\s\S]*?\})\s*\);/g.exec(responseText);
    if (!match) throw new Error("Failed to parse the Instagram post embed data.");
    // @ts-expect-error i ain't gonna type this whole thing
    const contextJSON = JSON.parse(match[1]).require.find((x) => x[0] === "PolarisEmbedSimple").at(-1)[0].contextJSON;
    const shortcodeMedia = JSON.parse(contextJSON).gql_data?.shortcode_media;

    if (shortcodeMedia?.video_url) videoUrls.set(shortcodeMedia.shortcode, shortcodeMedia.video_url);
    for (const edge of shortcodeMedia?.edge_sidecar_to_children?.edges ?? []) {
      if (edge.node?.video_url) videoUrls.set(edge.node.shortcode, edge.node.video_url);
    }
  } catch {
    // rip
  }

  return videoUrls;
}

export async function fetchIgForUsername(username: string, wideEvent: WideEvent): Promise<FormattedInstagramPost[]> {
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

      const videoNodes: { video_url?: string; shortcode: string }[] = [];
      if (shortcodeMedia.__typename === "GraphVideo") {
        videoNodes.push(shortcodeMedia);
      } else if (shortcodeMedia.__typename === "GraphSidecar") {
        for (const edge of shortcodeMedia.edge_sidecar_to_children.edges) {
          if (edge.node.__typename === "GraphVideo") videoNodes.push(edge.node);
        }
      }

      let videoUrls = new Map<string, string>();
      if (videoNodes.some((node) => !node.video_url)) {
        videoUrls = await fetchVideoUrlsFromPostEmbed(shortcodeMedia.shortcode);
        addElement(wideEvent.extended, "video_url_fallback", shortcodeMedia.shortcode);
      }

      const formattedMedia: InstagramMedia[] = [];

      if (shortcodeMedia.__typename === "GraphImage") {
        formattedMedia.push({ url: shortcodeMedia.display_url, type: "image" });
      } else if (shortcodeMedia.__typename === "GraphVideo") {
        const url = shortcodeMedia.video_url || videoUrls.get(shortcodeMedia.shortcode) || shortcodeMedia.display_url;
        formattedMedia.push({ url, type: "video" });
      } else if (shortcodeMedia.__typename === "GraphSidecar") {
        for (const edge of shortcodeMedia.edge_sidecar_to_children.edges) {
          const child = edge.node;
          if (child.__typename === "GraphImage") {
            formattedMedia.push({ url: child.display_url, type: "image" });
          } else if (child.__typename === "GraphVideo") {
            const url = child.video_url || videoUrls.get(child.shortcode) || child.display_url;
            formattedMedia.push({ url, type: "video" });
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
        // Discord only supports up to 10 media items
        media: formattedMedia.filter((m) => m.url).slice(0, 10),
        postedAt: new Date(shortcodeMedia.taken_at_timestamp * 1000),
      });
    }
    return posts;
  } catch (error) {
    const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
    if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

    const message = error instanceof Error ? error.message : "Unknown error fetching Instagram embed data";
    addElement(wideEvent.extended, "fetch_errors", `${username}: ${message}`);
    await testChan.send(`Error fetching Instagram embed data for ${username}: ${message}`);
    return [];
  }
}

export async function fetchInstagram(source: "scheduled" | "random", wideEvent: WideEvent) {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  wideEvent.extended.fetch_source = source;

  for (const username of usernamesToWatch) {
    const formattedPosts = await fetchIgForUsername(username, wideEvent);
    for (const post of formattedPosts) {
      if (post.author !== username) {
        addElement(wideEvent.extended, "posts_skipped", { code: post.code, author: post.author, reason: "authorMismatch" });
        continue;
      }
      if (addHours(new Date(post.postedAt), 3) < new Date()) {
        addElement(wideEvent.extended, "posts_skipped", { code: post.code, author: post.author, reason: "oldPost" });
        continue;
      }
      await sendInstagramPost(post, wideEvent);
    }
  }
}

async function sendInstagramPost(post: FormattedInstagramPost, wideEvent: WideEvent) {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  if (!usernamesToWatch.includes(post.author as (typeof usernamesToWatch)[number])) {
    addElement(wideEvent.extended, "posts_skipped", { code: post.code, author: post.author, reason: "notInWatchlist" });
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
    addElement(wideEvent.extended, "posts_skipped", { code: post.code, author: post.author, reason: "alreadyExists" });
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
  addElement(wideEvent.extended, "posts_sent", { code: post.code, author: post.author });
}
