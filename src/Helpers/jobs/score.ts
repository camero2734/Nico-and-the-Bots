import { defineJob } from "@falcondev-oss/queue";
import type { Snowflake, TextChannel } from "discord.js";
import z from "zod/v4";
import { client } from "../../Altbots/nico";
import { createJobLogger } from "../logging/evlog";
import { updateUserScoreWorker } from "../score-manager";
import { getQueueByName } from "./helpers";

export const scoreJob = defineJob({
  schema: z.object({
    data: z.object({
      messageId: z.string(),
      channelId: z.string(),
      guildId: z.string(),
    }),
  }),
  workerOptions: {
    concurrency: 5,
  },
  async run({ data }, job) {
    const log = createJobLogger("score_update");

    const queue = getQueueByName(job.queueName);

    try {
      const count = await queue.count();
      log.set({ queueSize: count });

      const guild = await client.guilds.fetch(data.guildId as Snowflake);
      const channel = (await guild.channels.fetch(data.channelId)) as TextChannel;
      const msg = await channel.messages.fetch(data.messageId);

      await updateUserScoreWorker(msg, log);

      log.emit({ outcome: "success" });
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e));
      log.emit({ outcome: "error" });
    }
  },
});
