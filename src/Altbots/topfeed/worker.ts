import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { checkInstagram } from "./instagram/check";
import { checkTwitter } from "./twitter/check";
import { checkYoutube } from "./youtube/check";
import topfeedBot from "./topfeed";

const QUEUE_NAME = "TopfeedCheck";
const redisOpts = {
  connection: new Redis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // biome-ignore lint/suspicious/noExplicitAny: Temporary issue with ioredis types
  }) as any,
};

export type JobType = "WEBSITES";

// biome-ignore lint/suspicious/noExplicitAny: any is the default type anyway
export const queue = new Queue<any, any, JobType | "TWITTER" | "INSTAGRAM" | "YOUTUBE">(QUEUE_NAME, {
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
        return;
      }
      if (name === "INSTAGRAM") {
        console.log(`Checking Instagram group: ${name} at ${Date.now()}`);
        await checkInstagram();
        return;
      }
      if (name === "YOUTUBE") {
        console.log(`Checking YouTube group: ${name} at ${Date.now()}`);
        await checkYoutube();
        return;
      }
      console.log(`Checking group: ${name}`);
      await topfeedBot.checkGroup(name);
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
