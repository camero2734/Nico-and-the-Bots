import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { checkInstagram } from "./instagram/check";
import { checkTwitter } from "./twitter/check";
import { checkYoutube } from "./youtube/check";
import { fetchWebsites } from "./websites/orchestrator";
import { DiscordLogProvider } from "../../../src/Helpers/effect";
import { Effect } from "effect";

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
    const start = Date.now();
    const name = job.name as QueueJobType;

    try {
      if (name === "TWITTER") {
        console.log(`Checking Twitter group: ${name} at ${Date.now()}`);
        await checkTwitter();
      } else if (name === "INSTAGRAM") {
        console.log(`Checking Instagram group: ${name} at ${Date.now()}`);
        await checkInstagram();
      } else if (name === "YOUTUBE") {
        console.log(`Checking YouTube group: ${name} at ${Date.now()}`);
        await checkYoutube();
      } else if (name === "WEBSITES") {
        console.log(`Checking Websites group: ${name} at ${Date.now()}`);
        await Effect.runPromise(fetchWebsites.pipe(DiscordLogProvider));
      }
    } catch (error) {
      console.error(`Error processing job ${name}:`, error);
      throw error;
    }

    const duration = Date.now() - start;
    console.log(`Job ${name} completed in ${duration}ms`);
  },
  {
    ...redisOpts,
    concurrency: 4,
  },
);
