import { subMinutes } from "date-fns";
import { MessageFlags } from "discord.js";
import { Data, Duration, Effect, pipe, Schedule } from "effect";
import type { WideEvent } from "../../../Helpers/logging/wide-event";
import { prisma } from "../../../Helpers/prisma-init";
import { keonsGuild } from "../topfeed";
import { fetchTwitterOfficialApi, TwitterApiClient } from "./api/official";
import { fetchTwitterUnofficialApi } from "./api/unofficial";
import { tweetToComponents } from "./components";
import { type Response, usernameData, usernamesToWatch } from "./constants";

class TwitterNoNewTweetsFound extends Data.TaggedError("TwitterNoNewTweetsFound") { }

export const handleTwitterResponse = (response: Response, wideEvent: WideEvent) =>
  Effect.gen(function* () {
    const { fetchedAt, parsedResult } = response;

    yield* Effect.logInfo(`Found ${parsedResult.tweets.length} tweet(s)`);
    // Sort tweets from oldest to newest so we process them in the order they were posted
    const sortedTweets = parsedResult.tweets.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let foundNewTweets = false;
    wideEvent.extended.tweets_found = parsedResult.tweets.length;
    const postsProcessed: string[] = [];
    const postsSkipped: { tweetId: string; reason: string }[] = [];

    for (const tweet of sortedTweets) {
      const tweetName = tweet.author.userName as (typeof usernamesToWatch)[number];
      if (!usernamesToWatch.includes(tweetName)) {
        yield* Effect.logWarning(`Skipping tweet from unknown user: ${tweetName}`);
        postsSkipped.push({ tweetId: tweet.id, reason: "unknownUser" });
        continue;
      }

      const existing = yield* Effect.tryPromise(() =>
        prisma.topfeedPost.findFirst({
          where: {
            type: "Twitter",
            handle: tweetName,
            id: tweet.id,
          },
        }),
      );

      if (existing) {
        yield* Effect.log(`Tweet ${tweet.id} from ${tweetName} already exists in the database.`);
        postsSkipped.push({ tweetId: tweet.id, reason: "alreadyExists" });
        continue;
      }

      foundNewTweets = true;


      const { roleId, channelId } = usernameData[tweetName];
      const components = yield* Effect.tryPromise(() => tweetToComponents(tweet, roleId));

      const channel = yield* Effect.tryPromise(() => keonsGuild.channels.fetch(channelId));
      if (!channel || !channel.isTextBased()) {
        throw new Error("Channel not found or is not text-based");
      }

      yield* Effect.tryPromise(async () => {
        await prisma.topfeedPost.create({
          data: {
            id: tweet.id,
            type: "Twitter",
            handle: tweetName,
            data: {
              userName: tweet.author.userName,
              name: tweet.author.name,
              profilePicture: tweet.author.profilePicture || null,
              coverPicture: tweet.author.coverPicture || null,
              text: tweet.text,
              url: tweet.url,
              createdAt: new Date(tweet.createdAt),
              extendedEntities: tweet.extendedEntities ? tweet.extendedEntities.media : [],
            },
          },
        });

        const m = await channel.send({
          components: [components],
          flags: MessageFlags.IsComponentsV2,
        });

        if (m.crosspostable) await m.crosspost();
      });

      postsProcessed.push(tweet.id);

      yield* Effect.logWarning(
        `Processed tweet ${tweet.id} from ${tweetName} in <#${channelId}>. Was delayed by: ${fetchedAt - new Date(tweet.createdAt).getTime()
        }ms`,
      );
    }

    wideEvent.extended.posts_processed = postsProcessed;
    wideEvent.extended.posts_skipped = postsSkipped;

    return yield* Effect.succeed(foundNewTweets);
  });

const expSchedule = (initialRun: boolean) =>
  Schedule.intersect(Schedule.exponential(Duration.millis(200), 2), Schedule.recurs(initialRun ? 0 : 4));

export const fetchTwitter = (source: "scheduled" | "webhook", _sinceTs: number | undefined, wideEvent: WideEvent) =>
  Effect.gen(function* () {
    const initialRun = _sinceTs === undefined;
    const sinceTs = _sinceTs || Math.floor(subMinutes(new Date(), 5).getTime() / 1000);
    const queryUsernames = usernamesToWatch.map((username) => `from:${username}`).join(" OR ");
    const query = `(${queryUsernames}) since_time:${sinceTs}`;

    wideEvent.extended.query = query;
    wideEvent.extended.since_ts = sinceTs;
    wideEvent.extended.initial_run = initialRun;

    yield* Effect.race(
      pipe(
        fetchTwitterOfficialApi(query),
        Effect.andThen((response) => handleTwitterResponse(response, wideEvent)),
        Effect.tapError(Effect.logError),
        Effect.filterOrFail(
          (newTweets) => newTweets,
          () => new TwitterNoNewTweetsFound(),
        ),
        Effect.retry(expSchedule(initialRun)),
        Effect.annotateLogs({ dataSource: "real" }),
      ),
      pipe(
        fetchTwitterUnofficialApi(query),
        Effect.andThen((response) => handleTwitterResponse(response, wideEvent)),
        Effect.tapError(Effect.logError),
        Effect.filterOrFail(
          (newTweets) => newTweets,
          () => new TwitterNoNewTweetsFound(),
        ),
        Effect.retry(expSchedule(initialRun)),
        Effect.annotateLogs({ dataSource: "unofficial" }),
      ),
    );
  })
    .pipe(Effect.annotateLogs({ bot: "keons", source }))
    .pipe(Effect.provide(TwitterApiClient.Default));
