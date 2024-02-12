import { Queue, QueueScheduler, Worker } from "bullmq";
import { minutesToMilliseconds } from "date-fns";
import IORedis from "ioredis";
import topfeedBot from "./topfeed";

const QUEUE_NAME = "TopfeedCheck";
const redisOpts = { connection: new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false }) };

export type JobType = "YOUTUBE" | "INSTAGRAM" | "WEBSITES" | "TWITTER";

export const scheduler = new QueueScheduler(QUEUE_NAME, redisOpts);

export const queue = new Queue<any, any, JobType>(QUEUE_NAME, {
    ...redisOpts,
    defaultJobOptions: {
        backoff: {
            type: "exponential",
            delay: minutesToMilliseconds(5) // 5m, 10m, 20m, 40m, 1.5h, 3h, etc.
        },
        removeOnComplete: true
    }
});

export const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
        const name = job.name as JobType;
        await topfeedBot.checkGroup(name);
    },
    redisOpts
);
