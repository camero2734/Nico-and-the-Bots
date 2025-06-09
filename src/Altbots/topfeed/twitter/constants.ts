import { z } from "zod";
import { roles, channelIDs } from "../../../Configuration/config";

export const usernamesToWatch = ["camero_2734", "twentyonepilots", "blurryface", "tylerrjoseph", "joshuadun"] as const;

type DataForUsername = {
  roleId: (typeof roles.topfeed.selectable)[keyof typeof roles.topfeed.selectable];
  channelId: (typeof channelIDs.topfeed)[keyof typeof channelIDs.topfeed];
};

export const usernameData: Record<(typeof usernamesToWatch)[number], DataForUsername> = {
  camero_2734: {
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    roleId: "572568489320120353" as any,
    // biome-ignore lint/suspicious/noExplicitAny: purposeful
    channelId: channelIDs.bottest as any,
  },
  blurryface: {
    roleId: roles.topfeed.selectable.dmaorg,
    channelId: channelIDs.topfeed.dmaorg,
  },
  twentyonepilots: {
    roleId: roles.topfeed.selectable.band,
    channelId: channelIDs.topfeed.band,
  },
  tylerrjoseph: {
    roleId: roles.topfeed.selectable.tyler,
    channelId: channelIDs.topfeed.tyler,
  },
  joshuadun: {
    roleId: roles.topfeed.selectable.josh,
    channelId: channelIDs.topfeed.josh,
  },
};

export const twitterEmojiId = "1380283149489143929";

const videoInfoSchema = z.object({
  aspect_ratio: z.tuple([z.number(), z.number()]),
  duration_millis: z.number().optional(),
  variants: z.array(
    z.object({
      content_type: z.string(),
      url: z.string().url(),
      bitrate: z.number().optional(),
    }),
  ),
});

const mediaSchema = z.object({
  type: z.enum(["photo", "video"]),
  url: z.string().url(),
  media_url_https: z.string().url(),
  video_info: videoInfoSchema.optional(),
});

const userSchema = z.object({
  userName: z.string(),
  name: z.string(),
  profilePicture: z.string().optional().nullable(),
  coverPicture: z.string().optional().nullable(),
});

const quotedOrRetweetedSchema = z
  .object({
    author: userSchema,
    url: z.string().url(),
    text: z.string(),
  })
  .partial();

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  url: z.string().url(),
  author: userSchema,
  quoted_tweet: quotedOrRetweetedSchema.nullable(),
  retweeted_tweet: quotedOrRetweetedSchema.nullable(),
  createdAt: z.string(),
  extendedEntities: z
    .object({
      media: z.array(mediaSchema),
    })
    .partial()
    .nullable(),
});
export type Tweet = z.infer<typeof tweetSchema>;

export const responseSchema = z.object({
  tweets: z.array(tweetSchema),
});
export type Response = {
  fetchedAt: number;
  query: string;
  parsedResult: z.infer<typeof responseSchema>;
};
