import { Queue, QueueScheduler, Worker } from "bullmq";
import { minutesToMilliseconds } from "date-fns";
import IORedis from "ioredis";
import topfeedBot from "./topfeed";
import { checkTwitter } from "./checkers/twitter";

const QUEUE_NAME = "TopfeedCheck";
const redisOpts = { connection: new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false }) };

export type JobType = "YOUTUBE" | "WEBSITES";

export const scheduler = new QueueScheduler(QUEUE_NAME, redisOpts);

export const queue = new Queue<any, any, JobType | "TWITTER">(QUEUE_NAME, {
    ...redisOpts,
    defaultJobOptions: {
        backoff: {
            type: "exponential",
            delay: minutesToMilliseconds(5) // 5m, 10m, 20m, 40m, 1.5h, 3h, etc.
        },
        removeOnComplete: true
    }
});

type QueueJobType = NonNullable<Awaited<ReturnType<typeof queue.getJob>>>['name'];

export const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
        const name = job.name as QueueJobType;

        if (name === "TWITTER") {
            console.log(`Checking Twitter group: ${name}`);
            await checkTwitter();
            return;
        } else {
            console.log(`Checking group: ${name}`);
            await topfeedBot.checkGroup(name);
        }
    },
    redisOpts
);
