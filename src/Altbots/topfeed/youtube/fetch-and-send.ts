import { youtube_v3 } from "@googleapis/youtube";
import {
  type APIComponentInContainer,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  roleMention,
  userMention,
} from "discord.js";
import { channelIDs, type roles, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
import F from "../../../Helpers/funcs";
// import { prisma } from "../../../Helpers/prisma-init";
import topfeedBot from "../topfeed";

type DataForUsername = {
  youtubeChannelId: string;
  roleId: (typeof roles.topfeed.selectable)[keyof typeof roles.topfeed.selectable];
  channelId: (typeof channelIDs.topfeed)[keyof typeof channelIDs.topfeed];
};

const logger = (...args: unknown[]) => console.log("[YT:Fetch]", ...args);

export const usernamesToWatch = ["twentyonepilots", "slushieguys"] as const;
export const usernameData: Record<(typeof usernamesToWatch)[number], DataForUsername> = {
  twentyonepilots: {
    // roleId: roles.topfeed.selectable.band,
    // channelId: channelIDs.topfeed.band,
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    roleId: "572568489320120353" as any,
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    channelId: channelIDs.bottest as any,
    youtubeChannelId: "UCBQZwaNPFfJ1gZ1fLZpAEGw",
  },
  slushieguys: {
    // roleId: roles.topfeed.selectable.tyler,
    // channelId: channelIDs.topfeed.tyler,
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    roleId: "572568489320120353" as any,
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    channelId: channelIDs.bottest as any,
    youtubeChannelId: "UCITp_ri9o-MBpLLaYZalTTQ",
  },
};

export const youtube = new youtube_v3.Youtube({ auth: secrets.apis.google.youtube });

interface FormattedYoutubePost {
  title: string;
  description: string;
  url: string;
  authorThumbnail: string;
  thumbnail?: string;
  author: string;
  postedAt: Date;
}

const youtubeEmojiId = "1380283728332587089";

export async function youtubeVideoToComponents(post: FormattedYoutubePost, roleId: string) {
  // Compose author line
  const authorLine = `**<:youtube:${youtubeEmojiId}> [${post.author}](https://www.youtube.com/@${post.author})**`;

  const role = await topfeedBot.guild.roles.fetch(roleId);
  if (!role) throw new Error(`Role with ID ${roleId} not found`);

  // Compose main post section
  const mainSection: APIComponentInContainer[] = [
    {
      type: ComponentType.Section,
      accessory: {
        type: ComponentType.Thumbnail,
        media: {
          url: post.authorThumbnail,
        },
      },
      components: [
        {
          type: ComponentType.TextDisplay,
          content: authorLine,
        },
        {
          type: ComponentType.TextDisplay,
          content: `**${post.title}**`,
        },
        {
          type: ComponentType.TextDisplay,
          content: post.description,
        },
        {
          type: ComponentType.TextDisplay,
          content: `[View on YouTube](${post.url})`,
        },
      ],
    },
  ];

  // Compose media gallery section
  const mediaSection: APIComponentInContainer[] = post.thumbnail
    ? [
        {
          type: ComponentType.Separator,
          divider: false,
          spacing: 1,
        },
        {
          type: ComponentType.MediaGallery,
          items: [
            {
              media: { url: post.thumbnail },
            },
          ],
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

export async function fetchYoutube({
  username,
  authorThumbnail,
  source,
}: { username: keyof typeof usernameData; authorThumbnail: string; source: "scheduled" }) {
  logger("Here");
  const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  const roleId = usernameData[username as keyof typeof usernameData]?.roleId;
  if (!roleId) {
    await testChan.send(`${userMention(userIDs.me)} No role ID found for username: ${username}`).catch(console.error);
    return;
  }

  const targetChannel = await topfeedBot.guild.channels.fetch(usernameData[username]?.channelId);
  if (!targetChannel || !targetChannel.isTextBased()) {
    await testChan.send(`${userMention(userIDs.me)} No text channel found for username: ${username}`);
    return;
  }

  logger(`Fetching recent YouTube posts for ${username} (${source})`);
  await testChan.send(`[${source}] Fetching recent YouTube posts for ${username}`).catch(console.error);

  const uploadsPlaylistId = usernameData[username as keyof typeof usernameData]?.youtubeChannelId;
  if (!uploadsPlaylistId) {
    await testChan
      .send(`${userMention(userIDs.me)} No uploads playlist ID found for username: ${username}`)
      .catch(console.error);
    return;
  }

  const uploads = await youtube.playlistItems.list({
    part: ["id", "snippet", "contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults: 5,
  });

  if (!uploads.data.items || uploads.data.items.length === 0) {
    logger("No YouTube uploads found.");
    return;
  }

  for (const upload of uploads.data.items) {
    const videoId = upload.contentDetails?.videoId;
    if (!videoId) {
      logger("No video ID found for upload:", upload);
      continue;
    }

    // const existing = await prisma.topfeedPost.findFirst({
    //   where: {
    //     type: "Youtube",
    //     handle: username,
    //     id: videoId,
    //   },
    // });

    // if (existing) {
    //   logger(`YT video already exists for ${username}: ${videoId}`);
    //   continue;
    // }

    const formattedPost: FormattedYoutubePost = {
      title: upload.snippet?.title || "*No title*",
      description: upload.snippet?.description || "*No description*",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      authorThumbnail: authorThumbnail,
      thumbnail:
        upload.snippet?.thumbnails?.maxres?.url ||
        upload.snippet?.thumbnails?.high?.url ||
        upload.snippet?.thumbnails?.default?.url ||
        undefined,
      author: username,
      postedAt: new Date(upload.snippet?.publishedAt || Date.now()),
    };

    const components = await youtubeVideoToComponents(formattedPost, roleId);

    // await prisma.topfeedPost.create({
    //   data: {
    //     id: videoId,
    //     type: "Youtube",
    //     handle: username,
    //     data: { ...formattedPost },
    //   },
    // });

    const m = await targetChannel.send({
      components: [components],
      flags: MessageFlags.IsComponentsV2,
    });

    if (m.crosspostable) await m.crosspost();
  }
}
