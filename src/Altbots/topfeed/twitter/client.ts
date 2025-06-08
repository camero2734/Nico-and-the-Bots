import { Data, Effect } from "effect";
import { TwitterOpenApi } from "twitter-openapi-typescript";
import secrets from "../../../Configuration/secrets";

const twitter = new TwitterOpenApi();

class TwitterLoginError extends Data.TaggedError("HttpError") {}

export class TwitterApiClient extends Effect.Service<TwitterApiClient>()("TwitterApiClient", {
  effect: Effect.tryPromise({
    try: async () => {
      console.log("Logging in to Twitter API...");
      return twitter.getClientFromCookies({
        ct0: secrets.apis.twitter.ct0,
        auth_token: secrets.apis.twitter.auth_token,
      });
    },
    catch: () => new TwitterLoginError(),
  }),
}) {}
