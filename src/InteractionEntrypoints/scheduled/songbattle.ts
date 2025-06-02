import { Cron } from "croner";
import { addHours } from "date-fns";
import {
	AttachmentBuilder,
	ButtonStyle,
	ComponentType,
	ContainerBuilder,
	type MessageEditOptions,
	MessageFlags,
	ThreadAutoArchiveDuration,
	roleMention,
} from "discord.js";
import { nanoid } from "nanoid";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import { invalidateCache, withCache } from "../../Helpers/cache";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import {
	type Album,
	PREFIX,
	Result,
	type SongContender,
	calculateHistory,
	createResultsChart,
	determineNextMatchup,
	determineResult,
	embedFooter,
	fromSongId,
	getTotalMatches,
	toSongId,
} from "./songbattle.consts";

const entrypoint = new ManualEntrypoint();

export const cron = Cron(
	"0 17 * * *",
	{ timezone: "Europe/Amsterdam" },
	songBattleCron,
);

const SLOWMODE_SECONDS = 30;
const CRON_ENABLED = true;

// Enable slowmode in the old thread after a while
Cron("30 17 * * *", { timezone: "Europe/Amsterdam" }, async () => {
	if (!CRON_ENABLED) return;

	// Get song battle channel
	const channel = await guild.channels.fetch(channelIDs.songbattles);
	if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

	// Get the latest poll
	const poll = await prisma.poll.findMany({
		where: {
			name: { startsWith: PREFIX },
		},
		orderBy: { id: "desc" },
		take: 3,
	});

	if (!poll) return;

	const [_, previousPoll, eerPreviousPoll] = poll;

	if (!previousPoll) return;
	const previousMessage = await channel.messages.fetch(previousPoll.options[2]);
	if (previousMessage) {
		const thread = previousMessage.thread;
		if (thread) await thread.setRateLimitPerUser(SLOWMODE_SECONDS);
	}

	// Also lock the previous thread
	if (!eerPreviousPoll) return;
	const eerPreviousMessage = await channel.messages.fetch(
		eerPreviousPoll.options[2],
	);
	if (eerPreviousMessage) {
		const thread = eerPreviousMessage.thread;
		if (thread) {
			await thread.setLocked(true);
			await thread.setArchived(true);
		}
	}
});

export async function songBattleCron() {
	if (!CRON_ENABLED) return;

	// Get song battle channel
	const channel = await guild.channels.fetch(channelIDs.songbattles);
	if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

	// Determine the next matchup
	const history = await calculateHistory();
	const {
		song1,
		song2,
		song1Wins,
		song2Wins,
		song1Losses,
		song2Losses,
		album1,
		album2,
		nextBattleNumber,
		totalMatches,
	} = determineNextMatchup(history);

	// Update the previous battle's message
	await updatePreviousSongBattleMessage();

	const startsAt = new Date();
	const endsAt = cron.nextRun();
	if (!endsAt) throw new CommandError("Failed to determine end time");

	// Ping message
	const mention = roleMention(roles.songBattles);
	await channel.send({
		flags: MessageFlags.IsComponentsV2,
		components: [{ type: ComponentType.TextDisplay, content: mention }],
		allowedMentions: { roles: [roles.songBattles] },
	});

	// Placeholder message
	const m = await channel.send({
		flags: MessageFlags.IsComponentsV2,
		components: [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: "Receiving new song battle...",
					},
				],
			},
		],
	});

	// Create database poll
	const pollName = `${PREFIX}${nextBattleNumber}-${nanoid(10)}`;
	const poll = await prisma.poll.create({
		data: {
			name: pollName,
			options: [toSongId(song1, album1), toSongId(song2, album2), m.id],
		},
	});

	const msgOptions = createMessageComponents({
		pollId: poll.id,
		nextBattleNumber,
		totalMatches,
		startsAt,
		song1: {
			song: song1,
			album: album1,
			nextBattleNumber,
			wins: song1Wins,
			losses: song1Losses,
		},
		song2: {
			song: song2,
			album: album2,
			nextBattleNumber,
			wins: song2Wins,
			losses: song2Losses,
		},
	});

	// Send the main message
	await m.edit(msgOptions);

	// Create a discussion thread
	const thread = await m.startThread({
		name: `Blurryface X Song Battle #${nextBattleNumber}`,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
	});

	await thread.send(
		`**Welcome to the song battle!** Discuss the two songs here. The winner will be revealed ${F.discordTimestamp(
			endsAt,
			"relative",
		)}`,
	);
}

export async function updatePreviousSongBattleMessage(skip = 0) {
	const channel = await guild.channels.fetch(channelIDs.songbattles);
	if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

	// Update the previous battle's message
	const previousPoll = await prisma.poll.findFirst({
		where: {
			name: { startsWith: PREFIX },
		},
		orderBy: { id: "desc" },
		include: { votes: true },
		skip: skip,
	});
	const previousMessageId = previousPoll?.options[2];
	if (!previousMessageId) return;

	const previousMessage = await channel.messages?.fetch(previousMessageId);
	if (!previousMessage) return;

	const history = await calculateHistory();
	const { histories, previousBattlesRaw } = history;

	const song1 = fromSongId(previousPoll.options[0]);
	const song2 = fromSongId(previousPoll.options[1]);

	const song1Hist = histories.get(previousPoll.options[0]);
	const song2Hist = histories.get(previousPoll.options[1]);

	const song1Wins = song1Hist ? song1Hist.rounds - song1Hist.eliminations : 1;
	const song2Wins = song2Hist ? song2Hist.rounds - song2Hist.eliminations : 1;

	const song1Losses = song1Hist ? song1Hist.eliminations : 1;
	const song2Losses = song2Hist ? song2Hist.eliminations : 1;

	const nextBattleNumber = previousBattlesRaw.length;

	const totalMatches = getTotalMatches(history);

	const result = determineResult(previousPoll);
	const winnerIdx = result !== Result.Tie && (result === Result.Song1 ? 0 : 1);
	const totalVotes = await prisma.vote.count({
		where: { pollId: previousPoll.id },
	});

	const chartBuffer = await createResultsChart(previousPoll.id);

	const msgOptions = createMessageComponents({
		pollId: previousPoll.id,
		nextBattleNumber,
		totalMatches,
		startsAt: new Date(),
		song1: {
			song: song1.song,
			album: song1.album,
			nextBattleNumber,
			wins: song1Wins - 1,
			losses: song1Losses - 1,
		},
		song2: {
			song: song2.song,
			album: song2.album,
			nextBattleNumber,
			wins: song2Wins - 1,
			losses: song2Losses - 1,
		},
		totalVotes,
		winnerIdx,
		voteCounts: previousPoll.votes.map((v) => v.choices[0]),
		chartBuffer,
	});

	await previousMessage.edit(msgOptions);
}

export async function updateCurrentSongBattleMessage() {
	// Get the latest poll
	const poll = await prisma.poll.findFirst({
		where: {
			name: { startsWith: PREFIX },
		},
		orderBy: { id: "desc" },
		include: { votes: true },
	});

	if (!poll) return false;

	const channel = await guild.channels.fetch(channelIDs.songbattles);
	if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

	const msg = await channel.messages.fetch(poll.options[2]);
	if (!msg) return false;

	const history = await calculateHistory();
	const { histories, previousBattlesRaw } = history;

	const totalMatches = getTotalMatches(history);

	const song1 = fromSongId(poll.options[0]);
	const song2 = fromSongId(poll.options[1]);

	const song1Hist = histories.get(poll.options[0]);
	const song2Hist = histories.get(poll.options[1]);

	const song1Wins = song1Hist ? song1Hist.rounds - song1Hist.eliminations : 1;
	const song2Wins = song2Hist ? song2Hist.rounds - song2Hist.eliminations : 1;

	const song1Losses = song1Hist ? song1Hist.eliminations : 1;
	const song2Losses = song2Hist ? song2Hist.eliminations : 1;

	const nextBattleNumber = previousBattlesRaw.length;
	const totalVotes = poll.votes.length;

	const msgOptions = createMessageComponents({
		pollId: poll.id,
		nextBattleNumber,
		totalMatches,
		startsAt: new Date(),
		song1: {
			song: song1.song,
			album: song1.album,
			nextBattleNumber,
			// Need to subtract 1 because the battle hasn't ended yet
			wins: song1Wins - 1,
			losses: song1Losses - 1,
		},
		song2: {
			song: song2.song,
			album: song2.album,
			nextBattleNumber,
			wins: song2Wins - 1,
			losses: song2Losses - 1,
		},
		totalVotes,
	});

	await msg.edit(msgOptions);
}

interface SongBattleDetails {
	pollId: number;
	nextBattleNumber: number;
	totalMatches: number;
	startsAt: Date;
	song1: SongBattleContender;
	song2: SongBattleContender;

	totalVotes?: number;
	winnerIdx?: number | false;
	voteCounts?: number[];
	chartBuffer?: Buffer;
}

interface SongBattleContender {
	song: SongContender;
	album: Album;
	nextBattleNumber: number;
	wins: number;
	losses: number;
}

function createMessageComponents(
	details: SongBattleDetails,
): MessageEditOptions {
	const {
		pollId,
		nextBattleNumber,
		totalMatches,
		song1,
		song2,
		totalVotes,
		winnerIdx,
		voteCounts,
		startsAt,
		chartBuffer,
	} = details;

	const wins1 = song1.wins > 0 ? ` | 🏅x${song1.wins}` : "";
	const wins2 = song2.wins > 0 ? ` | 🏅x${song2.wins}` : "";

	const losses1 = song1.losses > 0 ? ` | 💀x${song1.losses}` : "";
	const losses2 = song2.losses > 0 ? ` | 💀x${song2.losses}` : "";

	const hasWinner =
		totalVotes !== undefined &&
		winnerIdx !== undefined &&
		voteCounts !== undefined;

	const winnerPrefix1 = hasWinner && winnerIdx === 0 ? "🏆 " : "";
	const winnerPrefix2 = hasWinner && winnerIdx === 1 ? "🏆 " : "";

	const song1Votes = hasWinner ? voteCounts.filter((v) => v === 0).length : 0;
	const song2Votes = hasWinner ? voteCounts.filter((v) => v === 1).length : 0;

	const voteCounts1 = hasWinner
		? `\n*${song1Votes} vote${F.plural(song1Votes)}*`
		: "";
	const voteCounts2 = hasWinner
		? `\n*${song2Votes} vote${F.plural(song2Votes)}*`
		: "";

	const container = new ContainerBuilder({
		components: [
			{
				type: ComponentType.TextDisplay,
				content: `# Battle #${nextBattleNumber} / ${totalMatches}\n-# Blurryface 10th Anniversary Song Battles`,
			},
			{ type: ComponentType.Separator, divider: false, spacing: 1 },
			{
				type: ComponentType.Section,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `**${winnerPrefix1}${song1.song.name}**`,
					},
					{ type: ComponentType.TextDisplay, content: `*${song1.album.name}*` },
					{
						type: ComponentType.TextDisplay,
						content: `<:youtube:1365419055594606592>[YouTube](${song1.song.yt})${wins1}${losses1}${voteCounts1}`,
					},
				],
				accessory: {
					type: ComponentType.Thumbnail,
					media: {
						url:
							song1.song.image ??
							song1.album.image ??
							"https://community.mp3tag.de/uploads/default/original/2X/a/acf3edeb055e7b77114f9e393d1edeeda37e50c9.png",
					},
					description: `Album cover for ${song1.album.name}`,
				},
			},
			{
				type: ComponentType.Separator,
				divider: true,
				spacing: 2,
			},
			{
				type: ComponentType.Section,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: `**${winnerPrefix2}${song2.song.name}**`,
					},
					{ type: ComponentType.TextDisplay, content: `*${song2.album.name}*` },
					{
						type: ComponentType.TextDisplay,
						content: `<:youtube:1365419055594606592>[YouTube](${song2.song.yt})${wins2}${losses2}${voteCounts2}`,
					},
				],
				accessory: {
					type: ComponentType.Thumbnail,
					media: {
						url:
							song2.song.image ??
							song2.album.image ??
							"https://community.mp3tag.de/uploads/default/original/2X/a/acf3edeb055e7b77114f9e393d1edeeda37e50c9.png",
					},
					description: `Album cover for ${song2.album.name}`,
				},
			},
			{
				type: ComponentType.Separator,
				divider: true,
				spacing: 1,
			},
			{
				type: ComponentType.TextDisplay,
				content: "Which song wins this round?",
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						style: ButtonStyle.Primary,
						label: song1.song.name,
						custom_id: genButtonId({
							songId: toSongId(song1.song, song1.album),
							pollId: pollId.toString(),
						}),
						emoji: { id: song1.song.emoji ?? song1.album.emoji },
						disabled: hasWinner,
					},
					{
						type: ComponentType.Button,
						style: ButtonStyle.Primary,
						label: song2.song.name,
						custom_id: genButtonId({
							songId: toSongId(song2.song, song2.album),
							pollId: pollId.toString(),
						}),
						emoji: { id: song2.song.emoji ?? song2.album.emoji },
						disabled: hasWinner,
					},
					{
						type: ComponentType.Button,
						style: ButtonStyle.Link,
						label: "Info / Rules",
						url: "https://discord.com/channels/269657133673349120/1211412086442426429/1363596621241253888",
						disabled: hasWinner,
					},
				],
			},
			{
				type: ComponentType.TextDisplay,
				content: `-# ${embedFooter(totalVotes || 0, cron.nextRun(addHours(startsAt, 1)) || new Date())}`,
				id: 8004,
			},
		],
	});

	const files = [];
	if (chartBuffer && hasWinner) {
		files.push(new AttachmentBuilder(chartBuffer, { name: "chart.png" }));

		container.addMediaGalleryComponents({
			type: ComponentType.MediaGallery,
			items: [
				{
					media: { url: "attachment://chart.png" },
					description: `Vote distribution over time for ${song1.song.name} vs ${song2.song.name}`,
				},
			],
		});
	}

	return { components: [container], files };
}

const genButtonId = entrypoint.addInteractionListener(
	"songBattleButton",
	["pollId", "songId"],
	async (ctx, args) => {
		await ctx.deferReply({ ephemeral: true });
		if (!ctx.isButton()) return;

		await ctx.editReply({ content: "Processing your vote..." });

		const { song, album } = fromSongId(args.songId);

		// Find associated poll
		const pollId = Number.parseInt(args.pollId);
		const poll = await withCache(
			`sb:poll-${pollId}`,
			() =>
				prisma.poll.findUnique({
					where: { id: pollId },
					select: { options: true },
				}),
			600,
		);

		if (!poll) throw new CommandError("Poll not found");

		const choiceId = poll.options.findIndex((o) => o === args.songId);

		// Check if the user has already voted
		const existingVote = await withCache(
			`sb:vote-${pollId}-${ctx.user.id}`,
			() =>
				prisma.vote.findFirst({
					select: { id: true, choices: true },
					where: { pollId, userId: ctx.user.id },
				}),
			30,
		);

		if (existingVote && existingVote.choices[0] === choiceId) {
			await ctx.editReply({
				content: `You already voted for ${song.name} on the album ${album.name}. But thanks for confirming.`,
			});
			return;
		}
		invalidateCache(`sb:vote-${pollId}-${ctx.user.id}`);

		// Create or update the vote
		await prisma.vote.upsert({
			where: { pollId_userId: { pollId, userId: ctx.user.id } },
			create: {
				pollId,
				userId: ctx.user.id,
				choices: [choiceId],
			},
			update: {
				choices: [choiceId],
			},
		});

		// Update main message vote count
		withCache(
			`sb:votes-${pollId}`,
			async () => {
				await updateCurrentSongBattleMessage();
			},
			5,
		);

		if (existingVote) {
			await ctx.editReply({
				content: `You changed your vote to ${song.name} on the album ${album.name}`,
			});
		} else {
			await ctx.editReply({
				content: `You voted for ${song.name} on the album ${album.name}`,
			});
		}
	},
);

export default entrypoint;
