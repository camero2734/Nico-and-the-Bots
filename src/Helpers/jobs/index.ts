import { createQueueClient } from '@falcondev-oss/queue';
import { scoreJob } from './score';
import { topfeedJob } from './topfeed';

export const jobs = {
  topfeed: topfeedJob,
  score: scoreJob,
}

const queue = createQueueClient<typeof jobs>();

export { queue };
