import { defineJob, UnrecoverableError } from "@falcondev-oss/queue";
import { LastFMResponseError } from "lastfm-ts-api";
import z from "zod/v4";
import { fm } from "../../InteractionEntrypoints/slashcommands/fm/_consts";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent } from "../logging/wide-event";
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
        console.error("[lastFm Worker] Error:", err);
      },
      failed: (job, err) => {
        console.error(`[lastFm Worker] Job ${job?.id} failed:`, err);
      },
    },
  },
  async run({ userId }) {
    const wideEvent = createBackgroundEvent("last_fm");
    wideEvent.extended.userId = userId;

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

      wideEvent.extended.lastFMUsername = user.lastFM.username;

      const topArtists = await fm.user.getTopArtists({ username: user.lastFM.username, limit: 1000 });

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
      finalizeWideEvent(wideEvent, "error", e);
      emitWideEvent(wideEvent);

      if (e instanceof LastFMResponseError && e.message.includes("User not found")) {
        throw new UnrecoverableError(`User with ID ${userId} not found on LastFM`);
      }
      throw e;
    }
  },
});
