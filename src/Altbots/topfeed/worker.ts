import { Queue, QueueScheduler, Worker } from "bullmq";
import { minutesToMilliseconds } from "date-fns";
import IORedis from "ioredis";
import { rollbar } from "../../Helpers/rollbar";
import topfeedBot from "./topfeed";

const QUEUE_NAME = "TopfeedCheck";
const onHeroku = process.env.ON_HEROKU === "1";
const redisOpts = onHeroku ? { connection: new IORedis(process.env.REDIS_URL) } : {};

export type JobType = "TWITTER" | "YOUTUBE" | "INSTAGRAM" | "WEBSITES";

export const scheduler = new QueueScheduler(QUEUE_NAME, redisOpts);

export const queue = new Queue<any, any, JobType>(QUEUE_NAME, {
    ...redisOpts,
    defaultJobOptions: {
        backoff: {
            type: "exponential",
            delay: minutesToMilliseconds(5) // 5m, 10m, 20m, 40m, 1.5h, 3h, etc.
        }
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
