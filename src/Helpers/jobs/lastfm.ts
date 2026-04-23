import { defineJob, UnrecoverableError } from "@falcondev-oss/queue";
import { LastFMResponseError } from "lastfm-ts-api";
import z from "zod/v4";
import { fm } from "../../InteractionEntrypoints/slashcommands/fm/_consts";
import { createJobLogger } from "../logging/evlog";
import { prisma } from "../prisma-init";

export const lastFmJob = defineJob({
  schema: z.object({
    userId: z.string(),
  }),
  workerOptions: {
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 2_000,
    },
    hooks: {
      error: (err) => {
        createJobLogger("last_fm_worker").error(new Error(String(err)), { worker: true });
      },
      failed: (job, err) => {
        createJobLogger("last_fm_worker").error(new Error(String(err)), { worker: true, jobId: job?.id });
      },
    },
  },
  async run({ userId }) {
    const log = createJobLogger("last_fm");
    log.set({ userId });

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          lastFM: true,
        },
      });

      if (!user) {
        throw new UnrecoverableError(`User with ID ${userId} not found`);
      }

      if (!user.lastFM) {
        throw new UnrecoverableError(`User with ID ${userId} does not have LastFM data`);
      }

      log.set({ lastFMUsername: user.lastFM.username });

      const topArtists = await Promise.race([
        fm.user.getTopArtists({ username: user.lastFM.username, limit: 1000 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LastFM API timeout")), 30000)),
      ]);

      const artistMap: PrismaJson.LastFMTopArtists = {};
      topArtists.topartists.artist.forEach((artist) => {
        if (artist.playcount) artistMap[artist.mbid || artist.name.toLowerCase()] = +artist.playcount;
      });

      await prisma.userLastFM.update({
        where: { userId },
        data: {
          topArtists: artistMap,
        },
      });
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e));
      log.emit({ outcome: "error" });

      if (e instanceof LastFMResponseError && e.message.includes("User not found")) {
        throw new UnrecoverableError(`User with ID ${userId} not found on LastFM`);
      }
      throw e;
    }
  },
});
