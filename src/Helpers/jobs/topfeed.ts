import { defineJob } from "@falcondev-oss/queue";
import { Effect } from "effect";
import z from "zod/v4";
import { checkInstagram } from "../../Altbots/topfeed/instagram/check";
import { checkTwitter } from "../../Altbots/topfeed/twitter/check";
import { fetchWebsites } from "../../Altbots/topfeed/websites/orchestrator";
import { checkYoutube } from "../../Altbots/topfeed/youtube/check";
import { DiscordLogProvider } from "../effect";
import { createJobLogger } from "../logging/evlog";

export const topfeedJob = defineJob({
  schema: z.object({
    type: z.enum(["TWITTER", "INSTAGRAM", "YOUTUBE", "WEBSITES"]),
  }),
  workerOptions: {
    concurrency: 4,
  },
  async run(payload) {
    const { type } = payload;

    const log = createJobLogger(`topfeed_${type.toLowerCase()}`);

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
      log.emit({ outcome: "success" });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      log.emit({ outcome: "error" });
    }
  },
});
