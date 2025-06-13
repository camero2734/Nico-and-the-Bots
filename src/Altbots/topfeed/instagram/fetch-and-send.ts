import { addDays } from "date-fns";
import {
  type APIComponentInContainer,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  roleMention,
  userMention,
} from "discord.js";
import { IgApiClient, type TimelineFeedResponseMedia_or_ad } from "instagram-private-api";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
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

const ig = new IgApiClient();
ig.state.generateDevice(secrets.apis.instagram.username);

let initialized = false;
async function initializeInstagram() {
  if (initialized) return;

  await ig.simulate.preLoginFlow().catch((error) => logger("Pre-login flow error:", error?.message));
  const loggedInUser = await ig.account.login(secrets.apis.instagram.username, secrets.apis.instagram.password);
  void loggedInUser;

  await ig.simulate.postLoginFlow().catch((error) => logger("Post-login flow error:", error?.message));
  initialized = true;
}

// Extract the best media URL from a post or carousel item
function extractMedia(item: TimelineFeedResponseMedia_or_ad): InstagramMedia[] {
  const media: InstagramMedia[] = [];

  const carouselMedia = item.carousel_media || [
    {
      video_versions: item.video_versions,
      image_versions2: item.image_versions2,
    },
  ];

  for (const mediaItem of carouselMedia) {
    if (Array.isArray(mediaItem.video_versions) && mediaItem.video_versions.length > 0) {
      const bestVideo = mediaItem.video_versions.sort((a, b) => b.width - a.width)[0];
      media.push({ url: bestVideo.url, type: "video" });
      continue;
    }

    const bestImage = mediaItem.image_versions2?.candidates.sort((a, b) => b.width - a.width)[0];
    if (!bestImage) continue; // Skip if no image found
    media.push({ url: bestImage.url, type: "image" });
  }

  return media;
}

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

export async function fetchInstagram(source: "scheduled" | "random") {
  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  await testChan.send(`[${source}] Fetching recent IG posts`).catch(console.error);

  try {
    await initializeInstagram();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during Instagram initialization";
    console.error(error);
    await testChan.send(`${userMention(userIDs.me)} Error initializing Instagram: ${message}`);
    return;
  }

  try {
    const feed = ig.feed.timeline("warm_start_fetch");
    const items = await feed.items({ pagination_source: "following" });

    const formattedPosts: FormattedInstagramPost[] = items
      .filter((item) => !item.ad_id)
      .map((item) => {
        const captionText = item?.caption?.text || "*No caption*";
        const authorName = item?.user?.username || "Unknown Author";

        // Create the formatted post object
        return {
          code: item.code,
          url: `https://instagram.com/p/${item.code}`,
          caption: captionText,
          author: authorName,
          media: extractMedia(item),
          postedAt: new Date(item.taken_at * 1000),
          authorImage: item.user.profile_pic_url,
        };
      });

    for (const post of formattedPosts) {
      await sendInstagramPost(post);
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

  if (addDays(new Date(post.postedAt), 1) < new Date()) {
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
