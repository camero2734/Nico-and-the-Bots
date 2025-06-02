import { addMinutes, differenceInSeconds } from "date-fns";
import { userMention } from "discord.js";
import { type TwitterApiUtilsResponse, TwitterOpenApi, type TwitterOpenApiClient } from "twitter-openapi-typescript";
import { channelIDs, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
import topfeedBot from "../topfeed";
import { fetchTwitter, usernamesToWatch } from "./fetch-and-send";

const twitter = new TwitterOpenApi();
let twitterClient: TwitterOpenApiClient | null = null;

const rateLimit = {
  remaining: 0,
  limit: 0,
  reset: undefined as number | undefined,
};
export async function withRateLimit<T extends TwitterApiUtilsResponse<unknown>>(f: () => Promise<T>): Promise<T> {
  console.log(
    `Rate limit: ${rateLimit.remaining}/${rateLimit.limit}/${rateLimit.reset} (in ${differenceInSeconds(rateLimit.reset ? new Date(rateLimit.reset * 1000) : new Date(), new Date())} seconds)`,
  );

  const waitTime = rateLimit.reset !== undefined ? rateLimit.reset - Math.floor(Date.now() / 1000) : undefined;
  if (rateLimit.reset !== undefined && rateLimit.remaining <= 0) {
    if (waitTime && waitTime > 0) {
      console.log(`Rate limit reached. Must wait for ${waitTime} seconds. Aborting...`);
      topfeedBot.guild.channels.fetch(channelIDs.bottest).then((channel) => {
        if (channel?.isTextBased()) {
          channel.send(
            `${userMention(userIDs.me)} Twitter check rate limit reached. Must wait for ${waitTime} seconds.`,
          );
        }
      });
      throw new Error("Rate limit reached. Aborting...");
    }
  }

  const response = await f();

  rateLimit.remaining = response.header.rateLimitRemaining;
  rateLimit.limit = response.header.rateLimitLimit;
  rateLimit.reset = response.header.rateLimitReset;

  if (waitTime && waitTime < 0) {
    const newRequestsPerSecond = rateLimit.reset
      ? Math.floor(rateLimit.remaining / (rateLimit.reset - Math.floor(Date.now() / 1000)))
      : -1;
    console.log("Rate limit reset. New requests per second: ", newRequestsPerSecond);
  }

  return response;
}

let lastCheckTime: number = Math.floor(addMinutes(new Date(), -5).getTime() / 1000);
export async function checkTwitter() {
  const client =
    twitterClient ||
    (await twitter.getClientFromCookies({
      ct0: secrets.apis.twitter.ct0,
      auth_token: secrets.apis.twitter.auth_token,
    }));
  twitterClient = client;

  const fromQuery = usernamesToWatch.map((username) => `from:${username}`).join(" OR ");
  const query = `(${fromQuery}) since_time:${lastCheckTime}`;

  const result = await withRateLimit(async () => {
    try {
      return await client.getTweetApi().getSearchTimeline({
        rawQuery: query,
        count: 1,
        product: "Latest",
      });
    } catch (error) {
      console.error("Error fetching Twitter timeline:", error);
      throw error;
    }
  });

  if (result.data.data?.[0]?.tweet) {
    console.log("There are new tweets to fetch.");
    await fetchTwitter("scheduled", lastCheckTime);
  }
  lastCheckTime = Math.floor(addMinutes(new Date(), -1).getTime() / 1000);
}
