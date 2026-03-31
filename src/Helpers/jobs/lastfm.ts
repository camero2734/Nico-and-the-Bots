import { defineJob, UnrecoverableError } from "@falcondev-oss/queue";
import z from "zod/v4";
import { fm } from "../../InteractionEntrypoints/slashcommands/fm/_consts";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent } from "../logging/wide-event";
import { prisma } from "../prisma-init";
import { connection } from "./helpers";

export const lastFmJob = defineJob({
  schema: z.object({
    userId: z.string(),
  }),
  workerOptions: {
    concurrency: 2,
    connection,
    limiter: {
      max: 5,
      duration: 2_000,
    }
  },
  async run({ userId }) {
    const wideEvent = createBackgroundEvent("score_update");

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          lastFM: true,
        }
      });

      if (!user) {
        throw new UnrecoverableError(`User with ID ${userId} not found`);
      }

      if (!user.lastFM) {
        throw new UnrecoverableError(`User with ID ${userId} does not have LastFM data`);
      }

      const topArtists = await fm.user.getTopArtists({ username: user.lastFM.username, limit: 1000 });

      const artistMap: PrismaJson.LastFMTopArtists = {}
      topArtists.artists.forEach((artist) => {
        artistMap[artist.mbid || artist.name.toLowerCase()] = artist.scrobbles;
      });

      await prisma.userLastFM.update({
        where: { userId },
        data: {
          topArtists: artistMap,
        }
      });
    } catch (e) {
      finalizeWideEvent(wideEvent, "error", e);
      emitWideEvent(wideEvent);
    }
  }
});
