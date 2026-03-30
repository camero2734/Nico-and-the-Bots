import { Queue } from "bullmq";
import Redis from "ioredis";

export const connection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const getQueueByName = (name: string): Queue => {
  return new Queue(name, { connection });
}