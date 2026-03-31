import { createQueueClient } from '@falcondev-oss/queue';
import { connection } from './helpers';
import { lastFmJob } from './lastfm';
import { scoreJob } from './score';
import { topfeedJob } from './topfeed';

export const jobs = {
  topfeed: topfeedJob,
  score: scoreJob,
  lastFm: lastFmJob,
}

const queue = createQueueClient<typeof jobs>({ connection });

for (const jobName of ["TWITTER", "INSTAGRAM", "YOUTUBE", "WEBSITES"] as const) {
  queue.topfeed.add({ type: jobName }, { repeat: { every: 1000 * 60 * 5 }, deduplication: { id: jobName } });
}

export { queue };
