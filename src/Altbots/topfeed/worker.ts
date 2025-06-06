import { Queue, QueueScheduler, Worker } from "bullmq";
import IORedis from "ioredis";
import { checkInstagram } from "./instagram/check";
import { checkTwitter } from "./twitter/check";
import { checkYoutube } from "./youtube/check";
import topfeedBot from "./topfeed";

const QUEUE_NAME = "TopfeedCheck";
const redisOpts = {
  connection: new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }),
};

export type JobType = "WEBSITES";

export const scheduler = new QueueScheduler(QUEUE_NAME, redisOpts);

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
  },
  redisOpts,
);
