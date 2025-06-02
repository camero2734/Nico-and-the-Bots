import { Queue, QueueScheduler, Worker } from "bullmq";
import IORedis from "ioredis";
import { checkTwitter } from "./twitter/check";
import topfeedBot from "./topfeed";
import { checkInstagram } from "./instagram/check";

const QUEUE_NAME = "TopfeedCheck";
const redisOpts = {
	connection: new IORedis(process.env.REDIS_URL, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
	}),
};

export type JobType = "YOUTUBE" | "WEBSITES";

export const scheduler = new QueueScheduler(QUEUE_NAME, redisOpts);

export const queue = new Queue<any, any, JobType | "TWITTER" | "INSTAGRAM">(
	QUEUE_NAME,
	{
		...redisOpts,
		defaultJobOptions: {
			removeOnComplete: true,
		},
	},
);

type QueueJobType = NonNullable<
	Awaited<ReturnType<typeof queue.getJob>>
>["name"];

export const worker = new Worker(
	QUEUE_NAME,
	async (job) => {
		const name = job.name as QueueJobType;

		if (name === "TWITTER") {
			console.log(`Checking Twitter group: ${name}`);
			await checkTwitter();
			return;
		}
		if (name === "INSTAGRAM") {
			console.log(`Checking Instagram group: ${name}`);
			await checkInstagram();
			return;
		}
		console.log(`Checking group: ${name}`);
		await topfeedBot.checkGroup(name);
	},
	redisOpts,
);
