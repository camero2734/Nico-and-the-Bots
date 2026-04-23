import { Queue } from "bullmq";
import Redis from "ioredis";

const baseOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  keepAlive: 10000,
  connectTimeout: 10000,
  commandTimeout: 10000,
};

export const connection = new Redis(process.env.REDIS_URL as string, baseOptions);

export const workerConnection = new Redis(process.env.REDIS_URL as string, baseOptions);

export const getQueueByName = (name: string): Queue => {
  return new Queue(name, { connection });
};
