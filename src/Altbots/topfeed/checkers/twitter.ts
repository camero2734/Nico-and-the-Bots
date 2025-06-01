import { TwitterApiUtilsResponse, TwitterOpenApi, TwitterOpenApiClient } from "twitter-openapi-typescript";
import secrets from "../../../Configuration/secrets";
import { addMinutes } from "date-fns";
import { fetchTwitter, usernamesToWatch } from "../fetchers/twitter";

const twitter = new TwitterOpenApi();
const twitterClient: TwitterOpenApiClient | null = null;

const rateLimit = {
  remaining: 0,
  limit: 0,
  reset: undefined as number | undefined,
}
export async function withRateLimit<T extends TwitterApiUtilsResponse<unknown>>(f: () => Promise<T>): Promise<T> {
  console.log(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit}/${rateLimit.reset}`);

  const waitTime = rateLimit.reset !== undefined ? rateLimit.reset - Math.floor(Date.now() / 1000) : undefined;
  if (rateLimit.reset !== undefined && rateLimit.remaining <= 5) {
    if (waitTime && waitTime > 0) {
      console.log(`Rate limit reached. Must wait for ${waitTime} seconds. Aborting...`);
      throw new Error("Rate limit reached. Aborting...");
    }
  }

  const response = await f();

  rateLimit.remaining = response.header.rateLimitRemaining;
  rateLimit.limit = response.header.rateLimitLimit;
  rateLimit.reset = response.header.rateLimitReset;

  if (waitTime && waitTime < 0) {
    const newRequestsPerSecond = rateLimit.reset ? Math.floor(rateLimit.remaining / (rateLimit.reset - Math.floor(Date.now() / 1000))) : -1;
    console.log("Rate limit reset. New requests per second: ", newRequestsPerSecond);
  }

  return response;
}

export async function checkTwitter() {
  const client = twitterClient || await twitter.getClientFromCookies({
    ct0: secrets.apis.twitter.ct0,
    auth_token: secrets.apis.twitter.auth_token
  });

  const sinceTs = Math.floor(addMinutes(new Date(), -60).getTime() / 1000);

  const fromQuery = usernamesToWatch.map(username => `from:${username}`).join(' OR ');
  const query = `(${fromQuery}) since_time:${sinceTs}`;

  console.log("Going to check Twitter with query:", query);
  const result = await withRateLimit(() => client.getTweetApi().getSearchTimeline({
    rawQuery: query,
    count: 1,
  }));

  console.log(JSON.stringify(result, null, 2), /RESULT/);

  if (result.data.data?.[0]?.tweet) {
    console.log("There are new tweets to fetch.");
    await fetchTwitter("scheduled");
  }
}