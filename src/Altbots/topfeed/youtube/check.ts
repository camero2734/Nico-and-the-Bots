import { userMention } from "@discordjs/formatters";
import { channelIDs, userIDs } from "../../../Configuration/config";
import { createJobLogger } from "../../../Helpers/logging/evlog";
import { keonsGuild } from "../topfeed";
import { fetchYoutube, usernameData, type usernamesToWatch, youtube } from "./fetch-and-send";

const postCountMap: Record<(typeof usernamesToWatch)[number], number> = {
  twentyonepilots: 0,
  slushieguys: 0,
  JoshuaDun: 0,
};

export async function checkYoutube() {
  const log = createJobLogger("youtube_check");

  try {
    const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
    if (!testChan || !testChan.isTextBased()) throw new Error("Test channel not found or is not text-based");

    const response = await youtube.channels.list({
      part: ["statistics", "snippet", "contentDetails"],
      id: Object.values(usernameData).map((data) => data.youtubeChannelId),
      maxResults: 10,
    });

    if (!response.data.items || response.data.items.length === 0) {
      log.set({ channels_found: 0 });
      log.emit({ outcome: "success" });
      return;
    }

    log.set({ channels_found: response.data.items.length });
    const channelsProcessed: string[] = [];
    const channelsUpdated: string[] = [];

    for (const channel of response.data.items) {
      const username = Object.keys(usernameData).find(
        (key) => usernameData[key as (typeof usernamesToWatch)[number]].youtubeChannelId === channel.id,
      ) as (typeof usernamesToWatch)[number] | undefined;

      if (!username) {
        continue;
      }

      const videoCountStr = channel.statistics?.videoCount;
      if (!videoCountStr) {
        continue;
      }

      const postCount = Number.parseInt(videoCountStr, 10);
      channelsProcessed.push(username);

      if (postCount !== postCountMap[username]) {
        if (postCountMap[username] !== 0) {
          channelsUpdated.push(username);
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

        await fetchYoutube({
          username,
          authorThumbnail,
          source: "scheduled",
        });
      } else if (Math.random() < 0.01) {
        await testChan.send(
          `[random] Current post counts: \n\`\`\`json\n${JSON.stringify(postCountMap, null, 2)}\n\`\`\``,
        );
      }
    }

    log.set({ channels_processed: channelsProcessed, channels_updated: channelsUpdated });
    log.emit({ outcome: "success" });
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)));
    log.emit({ outcome: "error" });
    throw error;
  }
}
