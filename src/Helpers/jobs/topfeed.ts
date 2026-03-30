import { defineJob } from "@falcondev-oss/queue";
import { Effect } from "effect";
import z from "zod/v4";
import { checkInstagram } from "../../Altbots/topfeed/instagram/check";
import { checkTwitter } from "../../Altbots/topfeed/twitter/check";
import { fetchWebsites } from "../../Altbots/topfeed/websites/orchestrator";
import { checkYoutube } from "../../Altbots/topfeed/youtube/check";
import { DiscordLogProvider } from "../effect";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent } from "../logging/wide-event";

export const topfeedJob = defineJob({
  schema: z.object({
    type: z.enum(["TWITTER", "INSTAGRAM", "YOUTUBE", "WEBSITES"]),
  }),
  workerOptions: {
    concurrency: 4
  },
  async run(payload) {
    const { type } = payload;

    const wideEvent = createBackgroundEvent(`topfeed_${type.toLowerCase()}`);

    try {
      if (type === "TWITTER") {
        await checkTwitter();
      } else if (type === "INSTAGRAM") {
        await checkInstagram();
      } else if (type === "YOUTUBE") {
        await checkYoutube();
      } else if (type === "WEBSITES") {
        await Effect.runPromise(fetchWebsites.pipe(DiscordLogProvider));
      }
      finalizeWideEvent(wideEvent, "success");
    } catch (error) {
      finalizeWideEvent(wideEvent, "error", error);
    }

    emitWideEvent(wideEvent);
  },
})