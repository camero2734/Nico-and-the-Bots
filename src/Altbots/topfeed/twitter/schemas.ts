import { z } from "zod";

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
