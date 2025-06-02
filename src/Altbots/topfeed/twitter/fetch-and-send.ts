import { subMinutes } from "date-fns";
import secrets from "../../../Configuration/secrets";
import {
	type APIComponentInContainer,
	type APIMediaGalleryItem,
	ButtonStyle,
	ComponentType,
	ContainerBuilder,
	MessageFlags,
	roleMention,
} from "discord.js";
import { z } from "zod";
import { channelIDs, roles } from "../../../Configuration/config";
import topfeedBot from "../topfeed";
import { prisma } from "../../../Helpers/prisma-init";
import F from "../../../Helpers/funcs";

export const usernamesToWatch = [
	"pootusmaximus",
	"twentyonepilots",
	"blurryface",
	"tylerrjoseph",
	"joshuadun",
] as const;

type DataForUsername = {
	roleId: (typeof roles.topfeed.selectable)[keyof typeof roles.topfeed.selectable];
	channelId: (typeof channelIDs.topfeed)[keyof typeof channelIDs.topfeed];
};

const usernameData: Record<(typeof usernamesToWatch)[number], DataForUsername> =
	{
		pootusmaximus: {
			roleId: "572568489320120353" as any,
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
type Tweet = z.infer<typeof tweetSchema>;

const responseSchema = z.object({
	tweets: z.array(tweetSchema),
});

export async function tweetToComponents(tweet: Tweet, roleId: string) {
	const media = tweet.extendedEntities?.media || [];

	const role = await topfeedBot.guild.roles.fetch(roleId);
	if (!role) throw new Error(`Role with ID ${roleId} not found`);

	const mediaItems: APIMediaGalleryItem[] = media
		.map((item) => {
			if (item.type === "video" && item.video_info) {
				const highestBitrateVariant = item.video_info.variants
					.filter((variant) => variant.content_type.startsWith("video/"))
					.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

				if (!highestBitrateVariant) return undefined;

				return {
					media: {
						url: highestBitrateVariant.url,
					},
				};
			} else if (item.type === "photo") {
				return {
					media: {
						url: item.media_url_https,
					},
				};
			}
			return undefined;
		})
		.filter((item): item is APIMediaGalleryItem => item !== undefined);

	// Compose author line
	const authorLine = `**[${tweet.author.name} (@${tweet.author.userName})](https://x.com/${tweet.author.userName})**`;

	// Compose retweet/quote info
	let contextSection: APIComponentInContainer[] = [];
	if (tweet.quoted_tweet?.url) {
		contextSection = [
			{
				type: ComponentType.Separator,
				divider: true,
				spacing: 1,
			},
			{
				type: ComponentType.Section,
				accessory: {
					type: ComponentType.Button,
					label: "View Quote",
					url: tweet.quoted_tweet.url,
					style: ButtonStyle.Link,
				},
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `🔁 Quoting [${tweet.quoted_tweet.author?.name} (@${tweet.quoted_tweet.author?.userName})](${tweet.quoted_tweet.url})`,
					},
					{
						type: ComponentType.TextDisplay,
						content: tweet.quoted_tweet.text || "",
					},
				],
			},
		];
	} else if (tweet.retweeted_tweet?.url) {
		contextSection = [
			{
				type: ComponentType.Separator,
				divider: true,
				spacing: 1,
			},
			{
				type: ComponentType.Section,
				accessory: {
					type: ComponentType.Button,
					label: "View Retweet",
					url: tweet.retweeted_tweet.url,
					style: ButtonStyle.Link,
				},
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `🔁 Retweet from [${tweet.retweeted_tweet.author?.name} (@${tweet.retweeted_tweet.author?.userName})](${tweet.retweeted_tweet.url})`,
					},
					{
						type: ComponentType.TextDisplay,
						content: tweet.retweeted_tweet.text || "",
					},
				],
			},
		];
	}

	// Compose main tweet section
	const mainSection: APIComponentInContainer[] = [
		{
			type: ComponentType.Section,
			accessory: {
				type: ComponentType.Thumbnail,
				media: {
					url:
						tweet.author.profilePicture ||
						"https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
				},
			},
			components: [
				{
					type: ComponentType.TextDisplay,
					content: authorLine,
				},
			],
		},
		{
			type: ComponentType.TextDisplay,
			content: tweet.text,
		},
		{
			type: ComponentType.TextDisplay,
			content: `[View on Twitter](${tweet.url})`,
		},
	];

	// Compose media gallery section if there are media items
	const mediaSection: APIComponentInContainer[] =
		mediaItems.length > 0
			? [
					{
						type: ComponentType.Separator,
						divider: false,
						spacing: 1,
					},
					{
						type: ComponentType.MediaGallery,
						items: mediaItems,
					},
				]
			: [];

	const footerSection: APIComponentInContainer[] = [
		{
			type: ComponentType.TextDisplay,
			content: `-# ${roleMention(roleId)} | Posted ${F.discordTimestamp(new Date(tweet.createdAt), "relative")}`,
		},
	];

	// Build the container
	const container = new ContainerBuilder({
		components: [
			...mainSection,
			...mediaSection,
			...contextSection,
			...footerSection,
		],
		accent_color: role.color,
	});

	return container;
}

export async function fetchTwitter(
	source: "webhook" | "scheduled",
	sinceTs?: number,
) {
	if (!secrets.twitterAlternateApiKey) {
		throw new Error("Unable to handle webhook: MISSING_TWITTER_API_KEY");
	}
	sinceTs ||= Math.floor(subMinutes(new Date(), 5).getTime() / 1000);

	const query = usernamesToWatch
		.map((username) => `from:${username}`)
		.join(" OR ");

	const testChannel = await topfeedBot.guild.channels
		.fetch(channelIDs.bottest)
		.catch(() => null);

	if (testChannel?.isSendable()) {
		await testChannel
			.send(
				`[${source}] Fetching tweets with query: (${query}) since_time:${sinceTs}`,
			)
			.catch(() => null);
	}

	const url = new URL(
		"https://api.twitterapi.io/twitter/tweet/advanced_search",
	);
	url.searchParams.append("query", `(${query}) since_time:${sinceTs}`);
	url.searchParams.append("queryType", "Latest");

	console.log(`Fetching tweets with query: ${url.toString()}`);

	const options = {
		method: "GET",
		headers: {
			"X-API-Key": secrets.twitterAlternateApiKey,
			"Content-Type": "application/json",
		},
	};

	const result = await fetch(url.toString(), options).then((r) => r.json());
	const parsedResult = responseSchema.parse(result);

	if (testChannel?.isSendable()) {
		const urls = parsedResult.tweets.map((tweet) => tweet.url).join("\n");
		await testChannel
			.send(`Found ${parsedResult.tweets.length} tweet(s)\n${urls}`)
			.catch(() => null);
	}

	// Sort tweets from oldest to newest so we process them in the order they were posted
	const sortedTweets = parsedResult.tweets.sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);

	for (const tweet of sortedTweets) {
		const tweetName = tweet.author
			.userName as (typeof usernamesToWatch)[number];
		if (!usernamesToWatch.includes(tweetName)) {
			throw new Error(`Tweet from unknown user: ${tweetName}`);
		}

		const existing = await prisma.topfeedPost.findFirst({
			where: {
				type: "Twitter",
				handle: tweetName,
				id: tweet.id,
			},
		});

		if (existing) {
			console.log(
				`Tweet ${tweet.id} from ${tweetName} already exists in the database.`,
			);
			continue; // Skip if tweet already exists
		}

		console.log(`Processing tweet ${tweet.id} from ${tweetName}`);
		console.log(JSON.stringify(tweet, null, 2));

		const { roleId, channelId } = usernameData[tweetName];
		const components = await tweetToComponents(tweet, roleId);

		const channel = await topfeedBot.guild.channels.fetch(channelId);
		if (!channel || !channel.isTextBased()) {
			throw new Error("Channel not found or is not text-based");
		}

		await prisma.topfeedPost.create({
			data: {
				id: tweet.id,
				type: "Twitter",
				handle: tweetName,
				data: {
					userName: tweet.author.userName,
					name: tweet.author.name,
					profilePicture: tweet.author.profilePicture || null,
					coverPicture: tweet.author.coverPicture || null,
					text: tweet.text,
					url: tweet.url,
					createdAt: new Date(tweet.createdAt),
					extendedEntities: tweet.extendedEntities
						? tweet.extendedEntities.media
						: [],
				},
			},
		});

		await channel.send({
			components: [components],
			flags: MessageFlags.IsComponentsV2,
		});
	}
}
