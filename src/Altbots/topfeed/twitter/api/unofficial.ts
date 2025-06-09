import { Data, Effect } from "effect";
import secrets from "../../../../Configuration/secrets";
import { type Response, responseSchema } from "../constants";

class TwitterUnofficialApiError extends Data.TaggedError("TwitterUnofficialApiError") {}
class UnableToParseResponseError extends Data.TaggedError("UnableToParseResponseError") {}

export const fetchTwitterUnofficialApi = (query: string) =>
  Effect.gen(function* () {
    if (!secrets.twitterAlternateApiKey) {
      return yield* Effect.fail("Unable to handle webhook: MISSING_TWITTER_API_KEY");
    }

    const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
    url.searchParams.append("query", query);
    url.searchParams.append("queryType", "Latest");

    yield* Effect.logDebug(`Fetching tweets with query: ${url.toString()}`);

    const options = {
      method: "GET",
      headers: {
        "X-API-Key": secrets.twitterAlternateApiKey,
        "Content-Type": "application/json",
      },
    };

    const result = yield* Effect.tryPromise({
      try: () => fetch(url.toString(), options).then((r) => r.json()),
      catch: () => new TwitterUnofficialApiError(),
    });
    const fetchedAt = Date.now();

    return yield* Effect.try({
      try: () => responseSchema.parse(result),
      catch: () => new UnableToParseResponseError(),
    }).pipe(Effect.map((parsedResult) => ({ fetchedAt, query, parsedResult }) satisfies Response));
  });
