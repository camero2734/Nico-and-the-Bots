import { createQueueClient } from '@falcondev-oss/queue';
import { scoreJob } from './score';
import { topfeedJob } from './topfeed';

export const jobs = {
  topfeed: topfeedJob,
  score: scoreJob,
}

const queue = createQueueClient<typeof jobs>();

for (const jobName of ["TWITTER", "INSTAGRAM", "YOUTUBE", "WEBSITES"] as const) {
  queue.topfeed.add({ type: jobName }, { repeat: { every: 1000 * 60 * 5 }, deduplication: { id: jobName } });
}

export { queue };
