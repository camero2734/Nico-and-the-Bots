import { Effect, Schema } from "effect";
import crypto from "node:crypto";
import * as Diff from "diff";
import { prisma } from "../../../Helpers/prisma-init";
import type { BasicDataForWebsite } from "./orchestrator";
import { WebsiteDataSchema, createMessageComponents } from "./common";

export const checkHtml = (data: BasicDataForWebsite) =>
  Effect.gen(function* () {
    const [text, latestItem] = yield* Effect.all(
      [
        Effect.tryPromise(() => fetch(data.url, { tls: { rejectUnauthorized: false } }).then((res) => res.text())),
        Effect.tryPromise(() =>
          prisma.topfeedPost.findFirst({
            where: { type: "Website", handle: data.url, subtype: "HTML" },
            orderBy: { createdAt: "desc" },
          }),
        ),
      ],
      { concurrency: "unbounded" },
    );
    const hash = crypto.createHash("sha256").update(text).digest("base64");

    const oldData = yield* Schema.decodeUnknown(WebsiteDataSchema)(latestItem?.data || {});
    const isNew = hash && oldData.hash !== hash;

    if (!isNew) return;

    const diff = Diff.createPatch(data.url, oldData.html || "", text);

    yield* Effect.tryPromise(() => createMessageComponents(data, "HTML", text, diff));
  });
