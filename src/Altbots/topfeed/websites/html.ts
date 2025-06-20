import { Effect, Schema } from "effect";
import crypto from "node:crypto";
import * as Diff from "diff";
import { prisma } from "../../../Helpers/prisma-init";
import type { BasicDataForWebsite } from "./orchestrator";
import { WebsiteDataSchema, createMessageComponents } from "./common";
import { keonsGuild } from "../topfeed";
import { MessageFlags } from "discord.js";

export const checkHtml = (data: BasicDataForWebsite) =>
  Effect.gen(function* () {
    const channel = yield* Effect.tryPromise(() => keonsGuild.channels.fetch(data.channelId));
    if (!channel || !channel.isTextBased())
      return yield* Effect.fail(new Error("Channel not found or is not text-based"));

    const [{ text, status }, latestItem] = yield* Effect.all(
      [
        Effect.tryPromise(() =>
          fetch(data.url, { tls: { rejectUnauthorized: false } }).then(async (res) => ({
            status: res.status,
            text: await res.text(),
          })),
        ),
        Effect.tryPromise(() =>
          prisma.topfeedPost.findFirst({
            where: { type: "Website", handle: data.url, subtype: "HTML" },
            orderBy: { createdAt: "desc" },
          }),
        ),
      ],
      { concurrency: "unbounded" },
    );

    if (data.expectedStatus && status !== data.expectedStatus) {
      Effect.logDebug(
        `Expected status ${data.expectedStatus} for ${data.displayName} (${data.url}), but got ${status}. Skipping...`,
      );
      return;
    }

    const hash = crypto.createHash("sha256").update(text).digest("base64");

    Effect.logDebug(`Fetched HTML for ${data.displayName} (${data.url}) with hash ${hash}`);

    const oldData = yield* Schema.decodeUnknown(WebsiteDataSchema)(latestItem?.data || {});
    const isNew = hash && oldData.hash !== hash;
    if (!isNew) return;

    Effect.logWarning(`HTML hash changed for ${data.displayName} (${data.url}) from ${oldData.hash} to ${hash}`);

    const diff = Diff.createPatch(data.url, oldData.html || "", text);
    const { container, file } = yield* Effect.tryPromise(() => createMessageComponents(data, "HTML", text, diff));

    yield* Effect.tryPromise(async () => {
      await prisma.topfeedPost.create({
        data: {
          id: `${hash}-${Date.now()}`,
          type: "Website",
          subtype: "HTML",
          handle: data.url,
          data: {
            hash,
            html: text,
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
