import * as Diff from "diff";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { Effect, Schema } from "effect";
import {
  type FormattedInstagramPost,
  fetchIgForUsername,
  instaPostToComponents,
  usernameData as instaUsernameData,
  usernamesToWatch as instaUsernamesToWatch,
} from "../../../Altbots/topfeed/instagram/fetch-and-send";
import { fetchTwitterOfficialApi, TwitterApiClient } from "../../../Altbots/topfeed/twitter/api/official";
import { fetchTwitterUnofficialApi } from "../../../Altbots/topfeed/twitter/api/unofficial";
import { tweetToComponents } from "../../../Altbots/topfeed/twitter/components";
import {
  type Tweet,
  type Response as TwitterResponse,
  usernameData as twitterUsernameData,
  usernamesToWatch as twitterUsernamesToWatch,
} from "../../../Altbots/topfeed/twitter/constants";
import { createMessageComponents, WebsiteDataSchema } from "../../../Altbots/topfeed/websites/common";
import { checkHeaders } from "../../../Altbots/topfeed/websites/headers";
import { type BasicDataForWebsite, websitesToWatch } from "../../../Altbots/topfeed/websites/orchestrator";
import {
  type FormattedYoutubePost,
  youtube,
  usernameData as youtubeUsernameData,
  youtubeVideoToComponents,
} from "../../../Altbots/topfeed/youtube/fetch-and-send";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import type { WideEvent } from "../../../Helpers/logging/wide-event";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const TopfeedTypes = <const>["instagram", "twitter", "youtube", "website"];

const command = new SlashCommand({
  description: "Debug a topfeed post",
  options: [
    {
      name: "type",
      description: "The topfeed type to debug",
      required: true,
      type: ApplicationCommandOptionType.String,
      choices: TopfeedTypes.map((t) => ({ name: t, value: t })),
    },
    {
      name: "url",
      description: "The URL of the post (or profile/website) to debug",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  if (ctx.user.id !== userIDs.me) throw new CommandError("You cannot use this command");

  const { type, url } = ctx.opts;

  ctx.wideEvent.extended.topfeed_debug = { type, url };

  if (type === "website") {
    const { container, file, unchanged } = await debugWebsite(url);
    await ctx.channel.send({ components: [container], files: [file], flags: MessageFlags.IsComponentsV2 });
    await ctx.editReply(
      `Sent the website debug preview below. ${unchanged ? " Note: the fetched content is identical to the last saved version, so the diff is empty." : ""
      }`,
    );
    return;
  }

  const components =
    type === "instagram"
      ? await debugInstagram(url, ctx.wideEvent)
      : type === "twitter"
        ? await debugTwitter(url)
        : await debugYoutube(url);

  await ctx.channel.send({ components: [components], flags: MessageFlags.IsComponentsV2 });
  await ctx.editReply(`Sent the ${type} debug preview below. Nothing was written to the database.`);
});

function parseInstagramUrl(url: string): { username?: string; shortcode?: string } {
  const postMatch = url.match(/instagram\.com\/(?:([\w.]+)\/)?(?:p|reels?)\/([\w-]+)/i);
  if (postMatch) return { username: postMatch[1], shortcode: postMatch[2] };

  const profileMatch = url.match(/instagram\.com\/([\w.]+)\/?(?:[?#].*)?$/i);
  if (profileMatch) return { username: profileMatch[1] };

  return {};
}

async function debugInstagram(url: string, wideEvent: WideEvent) {
  const { username, shortcode } = parseInstagramUrl(url);
  if (!username && !shortcode) throw new CommandError("Couldn't parse that Instagram URL");

  const usernamesToTry = username ? [username] : [...instaUsernamesToWatch];

  let post: FormattedInstagramPost | undefined;
  for (const name of usernamesToTry) {
    const posts = await fetchIgForUsername(name, wideEvent);
    post = shortcode ? posts.find((p) => p.code === shortcode) : posts.find((p) => p.author === name);
    if (post) break;
  }

  if (!post) {
    throw new CommandError(
      `Couldn't find that post via the Instagram embed fetch${shortcode ? ` (shortcode \`${shortcode}\`)` : ""}. It may be too old to appear in the embed feed.`,
    );
  }

  const roleId =
    instaUsernameData[post.author as keyof typeof instaUsernameData]?.roleId ?? roles.topfeed.selectable.band;
  return instaPostToComponents(post, roleId);
}

function parseTwitterUrl(url: string): { username?: string; tweetId?: string } {
  const statusMatch = url.match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/i);
  if (statusMatch && statusMatch[1].toLowerCase() !== "i") {
    return { username: statusMatch[1], tweetId: statusMatch[2] };
  }

  const genericMatch = url.match(/(?:twitter|x)\.com\/i\/(?:web\/)?status\/(\d+)/i);
  if (genericMatch) return { tweetId: genericMatch[1] };

  if (statusMatch) return { tweetId: statusMatch[2] };

  return {};
}

async function debugTwitter(url: string) {
  const { username, tweetId } = parseTwitterUrl(url);
  if (!tweetId) throw new CommandError("Couldn't parse that Twitter URL");

  const usernames = username ? [username] : [...twitterUsernamesToWatch];
  const query = `(${usernames.map((u) => `from:${u}`).join(" OR ")})`;

  const attempts: Array<() => Promise<TwitterResponse>> = [
    () => Effect.runPromise(fetchTwitterUnofficialApi(query)),
    () => Effect.runPromise(fetchTwitterOfficialApi(query).pipe(Effect.provide(TwitterApiClient.Default))),
  ];

  let tweet: Tweet | undefined;
  const seenIds: string[] = [];
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const response = await attempt();
      seenIds.push(...response.parsedResult.tweets.map((t) => t.id));
      tweet = response.parsedResult.tweets.find((t) => t.id === tweetId);
      if (tweet) break;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (!tweet) {
    throw new CommandError(
      `Couldn't find tweet \`${tweetId}\`` +
      `${errors.length ? `\nErrors: ${errors.join(" | ")}` : ""}` +
      `${seenIds.length ? `\nSeen IDs: ${seenIds.join(", ")}` : ""}`,
    );
  }

  const roleId =
    twitterUsernameData[tweet.author.userName as keyof typeof twitterUsernameData]?.roleId ??
    roles.topfeed.selectable.band;
  return tweetToComponents(tweet, roleId);
}

function parseYoutubeVideoId(url: string): string | undefined {
  const match =
    url.match(/youtube\.com\/(?:watch\?[^#]*v=|shorts\/|live\/|embed\/)([\w-]{11})/i) ||
    url.match(/youtu\.be\/([\w-]{11})/i);
  return match?.[1];
}

async function debugYoutube(url: string) {
  const videoId = parseYoutubeVideoId(url);
  if (!videoId) throw new CommandError("Couldn't parse that YouTube URL");

  const response = await youtube.videos.list({
    part: ["id", "snippet", "contentDetails"],
    id: [videoId],
  });

  const video = response.data.items?.[0];
  if (!video) throw new CommandError("Couldn't find that video via the YouTube API");

  const channelId = video.snippet?.channelId || undefined;
  const username = (Object.keys(youtubeUsernameData) as Array<keyof typeof youtubeUsernameData>).find(
    (name) => youtubeUsernameData[name].youtubeChannelId === channelId,
  );

  let authorThumbnail = "https://www.iconpacks.net/icons/2/free-youtube-logo-icon-2431-thumb.png";
  if (channelId) {
    const channelResponse = await youtube.channels.list({ part: ["snippet"], id: [channelId] });
    const channel = channelResponse.data.items?.[0];
    authorThumbnail =
      channel?.snippet?.thumbnails?.maxres?.url ||
      channel?.snippet?.thumbnails?.high?.url ||
      channel?.snippet?.thumbnails?.default?.url ||
      authorThumbnail;
  }

  const post: FormattedYoutubePost = {
    title: video.snippet?.title || "*No title*",
    description: video.snippet?.description || "*No description*",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    authorThumbnail,
    thumbnail:
      video.snippet?.thumbnails?.maxres?.url ||
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.default?.url ||
      undefined,
    author: username || video.snippet?.channelTitle || "unknown",
    postedAt: new Date(video.snippet?.publishedAt || Date.now()),
  };

  const roleId = username ? youtubeUsernameData[username].roleId : roles.topfeed.selectable.band;
  return youtubeVideoToComponents(post, roleId);
}

async function debugWebsite(url: string) {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new CommandError("That doesn't look like a valid URL");
  }

  const watched = websitesToWatch.find((w) => w.url === url);
  const method: "HTML" | "HEADERS" = watched?.operator === checkHeaders ? "HEADERS" : "HTML";

  const data: BasicDataForWebsite = {
    url,
    displayName: watched?.displayName ?? hostname,
    roleId: watched?.roleId ?? roles.topfeed.selectable.dmaorg,
    channelId: watched?.channelId ?? channelIDs.bottest
  };

  let content: string;
  if (method === "HEADERS") {
    const res = await fetch(url, { method: "HEAD", tls: { rejectUnauthorized: false } });
    content = [...Object.entries(res.headers.toJSON())]
      .filter(([k]) => !["date", "keep-alive", "connection"].includes(k.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  } else {
    const res = await fetch(url, { tls: { rejectUnauthorized: false } });
    content = await res.text();
  }

  const latest = await prisma.topfeedPost.findFirst({
    where: { type: "Website", handle: url, subtype: method },
    orderBy: { createdAt: "desc" },
  });

  let oldContent = "";
  try {
    const oldData = Schema.decodeUnknownSync(WebsiteDataSchema)(latest?.data || {});
    oldContent = (method === "HEADERS" ? oldData.headers : oldData.html) || "";
  } catch {
    // no op
  }

  const diff = Diff.createPatch(url, oldContent, content);
  const { container, file } = await createMessageComponents(data, method, content, diff);

  return { container, file, unchanged: oldContent !== "" && oldContent === content };
}

export default command;

