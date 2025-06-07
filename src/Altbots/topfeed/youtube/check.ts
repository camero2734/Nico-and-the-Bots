import { userMention } from "discord.js";
import { channelIDs, userIDs } from "../../../Configuration/config";
import topfeedBot from "../topfeed";
import { fetchYoutube, type usernamesToWatch, usernameData, youtube } from "./fetch-and-send";

const logger = (...args: unknown[]) => console.log("[YT:Check]", ...args);

const postCountMap: Record<(typeof usernamesToWatch)[number], number> = {
  twentyonepilots: 0,
  slushieguys: 0,
};

export async function checkYoutube() {
  const testChan = await topfeedBot.guild.channels.fetch(channelIDs.bottest);
  if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

  const response = await youtube.channels.list({
    part: ["statistics", "snippet", "contentDetails"],
    id: Object.values(usernameData).map((data) => data.youtubeChannelId),
    maxResults: 10,
  });

  if (!response.data.items || response.data.items.length === 0) {
    logger("No YouTube channels found.");
    return;
  }

  for (const channel of response.data.items) {
    const username = Object.keys(usernameData).find(
      (key) => usernameData[key as (typeof usernamesToWatch)[number]].youtubeChannelId === channel.id,
    ) as (typeof usernamesToWatch)[number] | undefined;

    if (!username) {
      logger(`No matching username found for channel ID: ${channel.id}`);
      continue;
    }

    const videoCountStr = channel.statistics?.videoCount;
    if (!videoCountStr) {
      logger(`No video count found for channel ID: ${channel.id}`);
      continue;
    }

    const postCount = Number.parseInt(videoCountStr, 10);

    logger(`User ${username} has ${postCount} posts (previously ${postCountMap[username]})`);

    if (postCount !== postCountMap[username]) {
      if (postCountMap[username] !== 0) {
        logger(`New posts for ${username}: ${postCount - postCountMap[username]} (Total: ${postCount})`);
        await testChan.send(
          `${userMention(userIDs.me)} YouTube posts for ${username} went from ${postCountMap[username]} to ${postCount}.`,
        );
      }
      postCountMap[username] = postCount;

      const authorThumbnail =
        channel.snippet?.thumbnails?.maxres?.url ||
        channel.snippet?.thumbnails?.high?.url ||
        channel.snippet?.thumbnails?.default?.url ||
        "https://www.iconpacks.net/icons/2/free-youtube-logo-icon-2431-thumb.png";

      logger(`Fetching new posts for ${username} with thumbnail: ${authorThumbnail}`);
      await fetchYoutube({
        username,
        authorThumbnail,
        source: "scheduled",
      });
    }
  }
}
