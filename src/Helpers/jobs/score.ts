import { defineJob } from "@falcondev-oss/queue";
import type { Snowflake, TextChannel } from "discord.js";
import z from "zod/v4";
import { NicoClient } from "../../../app";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent } from "../logging/wide-event";
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
    const wideEvent = createBackgroundEvent("score_update");

    const queue = getQueueByName(job.queueName);

    try {
      const count = await queue.count();
      wideEvent.extended.queueSize = count;

      const guild = await NicoClient.guilds.fetch(data.guildId as Snowflake);
      const channel = (await guild.channels.fetch(data.channelId)) as TextChannel;
      const msg = await channel.messages.fetch(data.messageId);

      await updateUserScoreWorker(msg, wideEvent);

      finalizeWideEvent(wideEvent, "success");
      emitWideEvent(wideEvent);
    } catch (e) {
      finalizeWideEvent(wideEvent, "error", e);
      emitWideEvent(wideEvent);
    }
  },
});
