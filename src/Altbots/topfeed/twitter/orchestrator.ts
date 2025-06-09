import { subMinutes } from "date-fns";
import { MessageFlags, userMention } from "discord.js";
import { Data, Duration, Effect, Schedule, pipe } from "effect";
import { channelIDs, userIDs } from "../../../Configuration/config";
import { prisma } from "../../../Helpers/prisma-init";
import topfeedBot from "../topfeed";
import { fetchTwitterOfficialApi, TwitterApiClient } from "./api/official";
import { fetchTwitterUnofficialApi } from "./api/unofficial";
import { usernameData, usernamesToWatch, type Response } from "./constants";
import { tweetToComponents } from "./components";

class TwitterNoNewTweetsFound extends Data.TaggedError("TwitterNoNewTweetsFound") {}

export const handleTwitterResponse = (
  response: Response,
  source: "scheduled" | "webhook",
  dataSource: "real" | "unofficial",
) =>
  Effect.gen(function* () {
    const { fetchedAt, query, parsedResult } = response;

    const testChannel = yield* Effect.tryPromise(() => topfeedBot.guild.channels.fetch(channelIDs.bottest));

    if (testChannel?.isSendable()) {
      yield* Effect.tryPromise(async () => {
        await testChannel.send(`[${source}/${dataSource}] Fetched tweets with query: ${query}`).catch(() => null);

        const urls = parsedResult.tweets.map((tweet) => tweet.url).join("\n");
        await testChannel.send(`Found ${parsedResult.tweets.length} tweet(s)\n${urls}`).catch(() => null);
      }).pipe(Effect.either);
    }

    // Sort tweets from oldest to newest so we process them in the order they were posted
    const sortedTweets = parsedResult.tweets.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let foundNewTweets = false;
    for (const tweet of sortedTweets) {
      const tweetName = tweet.author.userName as (typeof usernamesToWatch)[number];
      if (!usernamesToWatch.includes(tweetName)) {
        yield* Effect.log(`Skipping tweet from unknown user: ${tweetName}`);

        if (testChannel?.isSendable()) {
          yield* Effect.tryPromise(async () =>
            testChannel
              .send(`${userMention(userIDs.me)} Skipping tweet from unknown user: ${tweetName}`)
              .catch(console.error),
          ).pipe(Effect.either);
        }
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
        continue; // Skip if tweet already exists
      }

      foundNewTweets = true;

      yield* Effect.log(`Processing tweet ${tweet.id} from ${tweetName}`);
      yield* Effect.log(JSON.stringify(tweet, null, 2));

      const { roleId, channelId } = usernameData[tweetName];
      const components = yield* Effect.tryPromise(() => tweetToComponents(tweet, roleId));

      const channel = yield* Effect.tryPromise(() => topfeedBot.guild.channels.fetch(channelId));
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

        if (testChannel?.isSendable()) {
          await testChannel
            .send(
              `[${dataSource}] Processed tweet ${tweet.id} from ${tweetName} in <#${channelId}>. Was delayed by: ${fetchedAt - new Date(tweet.createdAt).getTime()}ms`,
            )
            .catch(console.error);
        }
      });
    }

    return yield* Effect.succeed(foundNewTweets);
  });

const expScheudle = (sinceTs?: number) =>
  Schedule.intersect(
    // Exponential backoff with max retries
    Schedule.exponential(Duration.millis(200), 2),
    Schedule.recurs(sinceTs ? 5 : 0),
  );

export const fetchTwitter = (source: "scheduled" | "webhook", _sinceTs?: number) =>
  Effect.gen(function* () {
    const sinceTs = _sinceTs || Math.floor(subMinutes(new Date(), 5).getTime() / 1000);
    const queryUsernames = usernamesToWatch.map((username) => `from:${username}`).join(" OR ");
    const query = `(${queryUsernames}) since_time:${sinceTs}`;

    yield* Effect.race(
      pipe(
        fetchTwitterOfficialApi(query),
        Effect.andThen((r) => handleTwitterResponse(r, source, "real")),
        // biome-ignore format:
        Effect.filterOrFail(newTweets => newTweets, () => new TwitterNoNewTweetsFound()),
        Effect.tapError(Effect.logError),
        Effect.retry(expScheudle(sinceTs)),
        Effect.annotateLogs({ dataSource: "real" }),
      ),
      pipe(
        fetchTwitterUnofficialApi(query),
        Effect.andThen((r) => handleTwitterResponse(r, source, "unofficial")),
        // biome-ignore format:
        Effect.filterOrFail(newTweets => newTweets, () => new TwitterNoNewTweetsFound()),
        Effect.tapError(Effect.logError),
        Effect.retry(expScheudle(sinceTs)),
        Effect.annotateLogs({ dataSource: "unofficial" }),
      ),
    );
  })
    .pipe(Effect.annotateLogs({ bot: "keons", source }))
    .pipe(Effect.provide(TwitterApiClient.Default));
