import { Effect, Schema } from "effect";
import crypto from "node:crypto";
import * as Diff from "diff";
import { prisma } from "../../../Helpers/prisma-init";
import type { BasicDataForWebsite } from "./orchestrator";
import { WebsiteDataSchema, createMessageComponents } from "./common";
import topfeedBot from "../topfeed";
import { MessageFlags } from "discord.js";

export const checkHeaders = (data: BasicDataForWebsite) =>
  Effect.gen(function* () {
    const channel = yield* Effect.tryPromise(() => topfeedBot.guild.channels.fetch(data.channelId));
    if (!channel || !channel.isTextBased())
      return yield* Effect.fail(new Error("Channel not found or is not text-based"));

    const [res, latestItem] = yield* Effect.all(
      [
        Effect.tryPromise(() => fetch(data.url, { method: "HEAD", tls: { rejectUnauthorized: false } })),
        Effect.tryPromise(() =>
          prisma.topfeedPost.findFirst({
            where: { type: "Website", handle: data.url, subtype: "HEADERS" },
            orderBy: { createdAt: "desc" },
          }),
        ),
      ],
      { concurrency: "unbounded" },
    );

    const headers = [...Object.entries(res.headers.toJSON())]
      // Filter out some headers that we don't care about
      .filter(([k]) => !["date", "keep-alive", "connection"].includes(k.toLowerCase()))
      // Ensure the headers are always in the same order
      .sort(([a], [b]) => a.localeCompare(b))
      // Stringify the headers
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const hash = crypto.createHash("sha256").update(headers).digest("base64");

    Effect.logDebug(`Fetched headers for ${data.displayName} (${data.url}) with hash ${hash}`, headers);

    const oldData = yield* Schema.decodeUnknown(WebsiteDataSchema)(latestItem?.data || {});
    const isNew = hash && oldData.hash !== hash;

    if (!isNew) return;

    Effect.logWarning(`Headers hash changed for ${data.displayName} (${data.url}) from ${oldData.hash} to ${hash}`);

    const diff = Diff.createPatch(data.url, oldData.headers || "", headers);

    const { container, file } = yield* Effect.tryPromise(() => createMessageComponents(data, "HEADERS", headers, diff));

    yield* Effect.tryPromise(async () => {
      await prisma.topfeedPost.create({
        data: {
          id: `${hash}-${Date.now()}`,
          type: "Website",
          subtype: "HEADERS",
          handle: data.url,
          data: {
            hash,
            headers,
          },
        },
      });
    });

    yield* Effect.tryPromise(() =>
      channel
        .send({
          components: [container],
          files: [file],
          flags: MessageFlags.IsComponentsV2,
        })
        .then((m) => (m.crosspostable ? m.crosspost() : m)),
    );
  });
