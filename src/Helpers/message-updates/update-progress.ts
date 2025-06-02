import { differenceInMilliseconds, parse } from "date-fns";
import {
	type Message,
	EmbedBuilder,
	type BaseMessageOptions,
	Colors,
} from "discord.js";
import progressBar from "string-progressbar";
import { channelIDs, emojiIDs } from "../../Configuration/config";
import F from "../funcs";
import type { MessageUpdate } from "./_queue";

const startDate = parse(
	"02 October 2021 12:00",
	"dd MMMM yyyy HH:mm",
	new Date(),
);
const endDate = parse(
	"02 October 2021 17:30",
	"dd MMMM yyyy HH:mm",
	new Date(),
);

const toEmoji = (id: string) => `<:name:${id}>`;
const startEmoji = toEmoji(emojiIDs.poll.start);
const filledEmoji = toEmoji(emojiIDs.poll.filled);
const emptyEmoji = toEmoji(emojiIDs.poll.empty);
const endEmoji = toEmoji(emojiIDs.poll.end);

const generateProgressBar = (): [string, boolean] => {
	const now = new Date();
	const elapsedTime = differenceInMilliseconds(now, startDate);
	const totalTime = differenceInMilliseconds(endDate, startDate);

	console.log(elapsedTime, totalTime);

	const [progress] = progressBar.filledBar(
		totalTime,
		Math.min(elapsedTime, totalTime - 1),
		8,
		emptyEmoji,
		filledEmoji,
	);
	return [`${startEmoji}${progress}${endEmoji}\u200b`, elapsedTime > totalTime];
};

const standardizeEmbed = (embed: EmbedBuilder): void => {
	embed.setFields([]);
	embed
		.setAuthor({
			name: "DEMAtronix™ Telephony System",
			iconURL: "https://i.imgur.com/csHALvp.png",
		})
		.setColor(0x7289da)
		.addFields([
			{
				name: "Upgrade almost finished...",
				value: `Expected to finish ${F.discordTimestamp(endDate, "relative")}`,
			},
		])
		.setImage(
			"https://media.discordapp.net/attachments/470324442082312192/893975637184880710/teaser.gif",
		)
		.setFooter({
			text: "DEMAtronix: Propaganda delivered promptly™",
			iconURL: "https://cdn.discordapp.com/emojis/860015969253326858.png",
		});
};

const initialMessage = async (): Promise<BaseMessageOptions> => {
	const [progress] = generateProgressBar();

	const embed = new EmbedBuilder().setDescription(progress);
	standardizeEmbed(embed);

	return {
		embeds: [embed],
	};
};

const update = async (msg: Message) => {
	const [progress, isDone] = generateProgressBar();

	if (!isDone) {
		const embed = EmbedBuilder.from(msg.embeds[0]);
		embed.setDescription(progress);
		standardizeEmbed(embed);

		await msg.edit({ embeds: [embed] });
	} else {
		const embed = EmbedBuilder.from(msg.embeds[0]);
		embed.setDescription(progress);
		standardizeEmbed(embed);
		embed.setFields([]);
		embed.addFields([
			{
				name: "Upgrade almost finished...",
				value: "Expected to finish `soon`",
			},
		]);
		embed.setColor(Colors.Red);

		await msg.edit({ embeds: [embed] });
	}
};

export const UpdateProgress = {
	name: "update-progress",
	initialMessage,
	update,
	channelId: channelIDs.announcements,
	intervalMinutes: 0.5,
} as MessageUpdate;
