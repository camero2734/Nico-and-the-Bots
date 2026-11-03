import { userMention } from "@discordjs/formatters";
import { addMinutes } from "date-fns";
import { Effect } from "effect";
import { type TwitterApiUtilsResponse, TwitterOpenApi, type TwitterOpenApiClient } from "twitter-openapi-typescript";
import { channelIDs, userIDs } from "../../../Configuration/config";
import secrets from "../../../Configuration/secrets";
import { DiscordLogProvider } from "../../../Helpers/effect";
import { createJobLogger } from "../../../Helpers/logging/evlog";
import { keonsGuild } from "../topfeed";
import { usernamesToWatch } from "./constants";
import { fetchTwitter } from "./orchestrator";

const twitter = new TwitterOpenApi();
let twitterClient: TwitterOpenApiClient | null = null;

const rateLimit = {
  remaining: 0,
  limit: 0,
  reset: undefined as number | undefined,
};

export async function withRateLimit<T extends TwitterApiUtilsResponse<unknown>>(
  f: () => Promise<T>,
  log: import("../../../Helpers/logging/evlog").BotLogger,
): Promise<T> {
  log.set({
    rate_limit_remaining: rateLimit.remaining,
    rate_limit_limit: rateLimit.limit,
    rate_limit_reset: rateLimit.reset,
  });

  const waitTime = rateLimit.reset !== undefined ? rateLimit.reset - Math.floor(Date.now() / 1000) : undefined;
  if (rateLimit.reset !== undefined && rateLimit.remaining <= 0) {
    if (waitTime && waitTime > 0) {
      log.set({ rate_limit_wait_seconds: waitTime });
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
    log.set({ new_rps: newRequestsPerSecond });
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
  const log = createJobLogger("twitter_check");

  try {
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
        log.set({ error_message: error instanceof Error ? error.message : "Unknown error" });
        throw error;
      }
    }, log);

    const usernameToStatusesCount: Record<string, number> = {};
    for (const { user } of result.data.data) {
      if (!user?.legacy) continue;
      usernameToStatusesCount[user.legacy.screenName] = user.legacy.statusesCount;
    }

    log.set({ statuses_count: usernameToStatusesCount });

    let changeDetected = false;
    let isFirstRun = true;
    for (const username of usernamesToWatch) {
      if (typeof usernameToStatusesCount[username] !== "number") {
        await testChan.send(`${userMention(userIDs.me)} Username ${username} not found in the following list.`);
        continue;
      }

      const currentCount = usernameToStatusesCount[username];
      const isUserFirstRun = postCountMap[username] === undefined;
      if (!isUserFirstRun) isFirstRun = false;

      if (currentCount !== postCountMap[username]) {
        if (!isUserFirstRun) {
          await testChan.send(
            `${userMention(userIDs.me)} Post count for ${username} changed from ${postCountMap[username]} to ${currentCount}`,
          );
        }
        postCountMap[username] = currentCount;
        changeDetected = true;
      }
    }

    log.set({ change_detected: changeDetected, is_first_run: isFirstRun });

    if (changeDetected) {
      await Effect.runPromise(
        fetchTwitter("scheduled", isFirstRun ? undefined : Math.floor(lastCheckTime / 1000), log).pipe(
          DiscordLogProvider,
        ),
      );
    } else if (Math.random() < 0.01) {
      await testChan.send(
        `[random] Current post counts: \n\`\`\`json\n${JSON.stringify(postCountMap, null, 2)}\n\`\`\``,
      );
    }
    lastCheckTime = addMinutes(new Date(), -1).getTime();

    log.emit({ outcome: "success" });
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)));
    log.emit({ outcome: "error" });
    throw error;
  }
}
