import { addMinutes, differenceInSeconds } from "date-fns";
import { userMention } from "discord.js";
import { Effect } from "effect";
import { type TwitterApiUtilsResponse, TwitterOpenApi, type TwitterOpenApiClient } from "twitter-openapi-typescript";
import { channelIDs, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
import { DiscordLogProvider } from "../../../Helpers/effect";
import { keonsGuild } from "../topfeed";
import { usernamesToWatch } from "./constants";
import { fetchTwitter } from "./orchestrator";

const logger = (...args: unknown[]) => console.log("[TW:Check]", ...args);

const twitter = new TwitterOpenApi();
let twitterClient: TwitterOpenApiClient | null = null;

const rateLimit = {
  remaining: 0,
  limit: 0,
  reset: undefined as number | undefined,
};
export async function withRateLimit<T extends TwitterApiUtilsResponse<unknown>>(f: () => Promise<T>): Promise<T> {
  logger(
    `Rate limit: ${rateLimit.remaining}/${rateLimit.limit}/${rateLimit.reset} (in ${differenceInSeconds(rateLimit.reset ? new Date(rateLimit.reset * 1000) : new Date(), new Date())} seconds)`,
  );

  const waitTime = rateLimit.reset !== undefined ? rateLimit.reset - Math.floor(Date.now() / 1000) : undefined;
  if (rateLimit.reset !== undefined && rateLimit.remaining <= 0) {
    if (waitTime && waitTime > 0) {
      logger(`Rate limit reached. Must wait for ${waitTime} seconds. Aborting...`);
      keonsGuild.channels.fetch(channelIDs.bottest).then((channel) => {
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
    logger("Rate limit reset. New requests per second: ", newRequestsPerSecond);
  }

  return response;
}

const postCountMap: Record<(typeof usernamesToWatch)[number], number | undefined> = {
  camero_2734: undefined,
  twentyonepilots: undefined,
  tylerrjoseph: undefined,
  joshuadun: undefined,
  blurryface: undefined,
};
let lastCheckTime: number = addMinutes(new Date(), -5).getTime();
export async function checkTwitter() {
  const client =
    twitterClient ||
    (await twitter.getClientFromCookies({
      ct0: secrets.apis.twitter.ct0,
      auth_token: secrets.apis.twitter.auth_token,
    }));
  twitterClient = client;

  const testChan = await keonsGuild.channels.fetch(channelIDs.bottest);
  if (!testChan?.isTextBased()) throw new Error("Test channel is not text-based");

  const result = await withRateLimit(async () => {
    try {
      return await client.getUserListApi().getFollowing({
        userId: "1733919401026400256",
      });
    } catch (error) {
      console.error("Error fetching Twitter timeline:", error);
      throw error;
    }
  });

  const usernameToStatusesCount: Record<string, number> = {};
  for (const { user } of result.data.data) {
    if (!user?.legacy) continue;
    usernameToStatusesCount[user.legacy.screenName] = user.legacy.statusesCount;
  }

  logger("Statuses count for usernames:", usernameToStatusesCount);

  let changeDetected = false;
  let isFirstRun = true;
  for (const username of usernamesToWatch) {
    if (typeof usernameToStatusesCount[username] !== "number") {
      logger(`Username ${username} not found in the following list.`);
      await testChan.send(`${userMention(userIDs.me)} Username ${username} not found in the following list.`);
      continue;
    }

    const currentCount = usernameToStatusesCount[username];
    const isUserFirstRun = postCountMap[username] === undefined;
    if (!isUserFirstRun) isFirstRun = false;

    if (currentCount !== postCountMap[username]) {
      if (!isUserFirstRun) {
        logger(`Post count for ${username} changed from ${postCountMap[username]} to ${currentCount}`);
        testChan
          .send(
            `${userMention(userIDs.me)} Post count for ${username} changed from ${postCountMap[username]} to ${currentCount}`,
          )
          .catch(console.error);
      }
      postCountMap[username] = currentCount;
      changeDetected = true;
    }
  }

  if (changeDetected) {
    logger("There are new tweets to fetch.");
    await Effect.runPromise(
      fetchTwitter("scheduled", isFirstRun ? undefined : Math.floor(lastCheckTime / 1000)).pipe(DiscordLogProvider),
    );
  } else if (Math.random() < 0.01) {
    await testChan.send(`[random] Current post counts: \n\`\`\`json\n${JSON.stringify(postCountMap, null, 2)}\n\`\`\``);
  }
  lastCheckTime = addMinutes(new Date(), -1).getTime();
}
