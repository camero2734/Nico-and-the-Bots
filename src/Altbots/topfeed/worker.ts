import { Queue, Worker } from "bullmq";
import { Effect } from "effect";
import { Redis } from "ioredis";
import { DiscordLogProvider } from "../../Helpers/effect";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent } from "../../Helpers/logging/wide-event";
import { checkInstagram } from "./instagram/check";
import { checkTwitter } from "./twitter/check";
import { fetchWebsites } from "./websites/orchestrator";
import { checkYoutube } from "./youtube/check";

const QUEUE_NAME = "TopfeedCheck";
const redisOpts = {
  connection: new Redis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // biome-ignore lint/suspicious/noExplicitAny: Temporary issue with ioredis types
  }) as any,
};

// biome-ignore lint/suspicious/noExplicitAny: any is the default type anyway
export const queue = new Queue<any, any, "WEBSITES" | "TWITTER" | "INSTAGRAM" | "YOUTUBE">(QUEUE_NAME, {
  ...redisOpts,
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

type QueueJobType = NonNullable<Awaited<ReturnType<typeof queue.getJob>>>["name"];

export const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const name = job.name as QueueJobType;
    const wideEvent = createBackgroundEvent(`topfeed_${name.toLowerCase()}`);

    try {
      if (name === "TWITTER") {
        await checkTwitter();
      } else if (name === "INSTAGRAM") {
        await checkInstagram();
      } else if (name === "YOUTUBE") {
        await checkYoutube();
      } else if (name === "WEBSITES") {
        await Effect.runPromise(fetchWebsites.pipe(DiscordLogProvider));
      }
      finalizeWideEvent(wideEvent, "success");
    } catch (error) {
      finalizeWideEvent(wideEvent, "error", error);
      throw error;
    }

    emitWideEvent(wideEvent);
  },
  {
    ...redisOpts,
    concurrency: 4,
  },
);
