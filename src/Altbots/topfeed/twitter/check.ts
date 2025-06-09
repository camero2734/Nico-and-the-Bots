import { addMinutes, differenceInSeconds } from "date-fns";
import { Effect } from "effect";
import type { TwitterApiUtilsResponse } from "twitter-openapi-typescript";
import { DiscordLogProvider } from "../../../Helpers/effect";
import { usernamesToWatch } from "./constants";
import { fetchTwitter } from "./orchestrator";
import { TwitterApiClient } from "./api/official";

const rateLimit = {
  remaining: 0,
  limit: 0,
  reset: undefined as number | undefined,
};
const withRateLimitEffect = <T extends TwitterApiUtilsResponse<unknown>>(f: () => Effect.Effect<T, unknown>) => {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `Rate limit: ${rateLimit.remaining}/${rateLimit.limit}/${rateLimit.reset} (in ${differenceInSeconds(
        rateLimit.reset ? new Date(rateLimit.reset * 1000) : new Date(),
        new Date(),
      )} seconds)`,
    );

    const waitTime = rateLimit.reset !== undefined ? rateLimit.reset - Math.floor(Date.now() / 1000) : undefined;
    if (rateLimit.reset !== undefined && rateLimit.remaining <= 0) {
      if (waitTime && waitTime > 0) {
        yield* Effect.logError(`Twitter check rate limit reached. Must wait for ${waitTime} seconds.`);
        return yield* Effect.fail("Rate limit reached. Aborting...");
      }
    }

    const response = yield* f();
    rateLimit.remaining = response.header.rateLimitRemaining;
    rateLimit.limit = response.header.rateLimitLimit;
    rateLimit.reset = response.header.rateLimitReset;
    if (waitTime && waitTime < 0) {
      const newRequestsPerSecond = rateLimit.reset
        ? Math.floor(rateLimit.remaining / (rateLimit.reset - Math.floor(Date.now() / 1000)))
        : -1;
      yield* Effect.logDebug("Rate limit reset. New requests per second: ", newRequestsPerSecond);
    }

    return yield* Effect.succeed(response);
  });
};

const postCountMap: Record<(typeof usernamesToWatch)[number], number | undefined> = {
  camero_2734: undefined,
  twentyonepilots: undefined,
  tylerrjoseph: undefined,
  joshuadun: undefined,
  blurryface: undefined,
};
let lastCheckTime: number = addMinutes(new Date(), -5).getTime();
export const checkTwitter = Effect.gen(function* () {
  const twitterClient = yield* TwitterApiClient;

  yield* Effect.logDebug("Checking Twitter for new posts...");

  const result = yield* withRateLimitEffect(() =>
    Effect.tryPromise(() =>
      twitterClient.getTweetApi().getSearchTimeline({
        product: "Latest",
        rawQuery: usernamesToWatch.map((username) => `from:${username}`).join(" OR "),
        count: 5,
      }),
    ),
  );

  const usernameToStatusesCount: Record<string, number> = {};
  for (const { user } of result.data.data) {
    if (!user?.legacy) continue;
    usernameToStatusesCount[user.legacy.screenName] = user.legacy.statusesCount;
  }

  yield* Effect.logDebug("Statuses count for usernames:", usernameToStatusesCount);

  let changeDetected = false;
  let isFirstRun = true;
  for (const username of usernamesToWatch) {
    if (typeof usernameToStatusesCount[username] !== "number") {
      yield* Effect.logWarning(`Username ${username} not found in the following list.`);
      continue;
    }

    const currentCount = usernameToStatusesCount[username];
    const isUserFirstRun = postCountMap[username] === undefined;
    if (!isUserFirstRun) isFirstRun = false;

    if (currentCount !== postCountMap[username]) {
      if (!isUserFirstRun) {
        yield* Effect.logWarning(
          `Post count for ${username} changed from ${postCountMap[username]} to ${currentCount}`,
        );
      }
      postCountMap[username] = currentCount;
      changeDetected = true;
    }
  }

  if (changeDetected) {
    Effect.logDebug("There are new tweets to fetch.");
    yield* fetchTwitter("scheduled", isFirstRun ? undefined : Math.floor(lastCheckTime / 1000)).pipe(
      DiscordLogProvider,
    );
  } else if (Math.random() < 0.01) {
    yield* Effect.logWarning(`Current post counts: \n\`\`\`json\n${JSON.stringify(postCountMap, null, 2)}\n\`\`\``);
  }
  lastCheckTime = addMinutes(new Date(), -1).getTime();
});
