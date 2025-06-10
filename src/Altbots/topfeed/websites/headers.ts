import { Effect, Schema } from "effect";
import crypto from "node:crypto";
import * as Diff from "diff";
import { prisma } from "../../../Helpers/prisma-init";
import type { BasicDataForWebsite } from "./orchestrator";
import { WebsiteDataSchema, createMessageComponents } from "./common";

export const checkHeaders = (data: BasicDataForWebsite) =>
  Effect.gen(function* () {
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

    yield* Effect.tryPromise(() => createMessageComponents(data, "HEADERS", headers, diff));
  });
