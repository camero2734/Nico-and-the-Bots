import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	TextChannel,
} from "discord.js";
import metascraper from "metascraper";
import metascraperDate from "metascraper-date";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperTitle from "metascraper-title";
import metascraperYoutube from "metascraper-youtube";
import { channelIDs, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const getYtInfo = metascraper([
	metascraperYoutube(),
	metascraperDate(),
	metascraperDescription(),
	metascraperImage(),
	metascraperTitle(),
]);

const command = new SlashCommand({
	description: "Submits an interview to the interview channel",
	options: [
		{
			name: "link",
			description: "The YouTube URL for the video",
			required: true,
			type: ApplicationCommandOptionType.String,
		},
	],
});

command.setHandler(async (ctx) => {
	const rawUrl = ctx.opts.link;

	await ctx.deferReply({ ephemeral: true });

	let id: string | undefined = "";
	if (rawUrl.indexOf("youtube.com/watch?v=") !== -1) {
		id = (/(?<=watch\?v=).*?(?=$|&|\?)/.exec(rawUrl) || [])[0];
	} else if (rawUrl.indexOf("youtu.be/") !== -1) {
		id = (/(?<=youtu\.be\/).*?(?=$|&|\?)/.exec(rawUrl) || [])[0];
	}
	if (!id) throw new CommandError("Invalid URL.");

	const url = `https://youtube.com/watch?v=${id}`;

	const existingInterview = await prisma.submittedInterview.findUnique({
		where: { url },
	});
	if (existingInterview)
		throw new CommandError("This interview has already been submitted");

	// Fetch info
	const embed = new EmbedBuilder()
		.setDescription("Fetching video info...")
		.setColor(0x111111);
	await ctx.editReply({ embeds: [embed] });

	const html = await fetch(url).then((r) => r.text());
	const metadata = await getYtInfo({ url, html });
	const channel = metadata.author || "Unknown";
	const date = metadata.date ? new Date(metadata.date) : new Date();
	const fullTitle = metadata.title || "No title provided";
	const thumbnail = metadata.image;
	const description = metadata.description || "No description provided";

	embed.setAuthor({
		name: ctx.member.displayName,
		iconURL: ctx.user.displayAvatarURL(),
	});
	embed.setTitle(fullTitle);
	embed.addFields([{ name: "Channel", value: channel, inline: true }]);
	// embed.addFields([{ name: "Views", value: `${view_count}`, inline: true }]);
	embed.addFields([
		{
			name: "Link",
			value: "[Click Here](https://youtu.be/" + id + ")",
			inline: true,
		},
	]);
	if (thumbnail) embed.setImage(thumbnail);
	embed.setDescription(description);
	embed.setURL(url);
	embed.addFields([
		{ name: "Uploaded", value: F.discordTimestamp(date, "relative") },
	]);

	const interviewsChannel = ctx.channel.guild.channels.cache.get(
		channelIDs.interviewsubmissions,
	) as TextChannel;

	const dbInterview = await prisma.submittedInterview.create({
		data: { url, submittedByUserId: ctx.user.id },
	});

	const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
		new ButtonBuilder()
			.setLabel("Approve")
			.setCustomId(genYesID({ interviewId: `${dbInterview.id}` }))
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setLabel("Reject")
			.setCustomId(genNoId({}))
			.setStyle(ButtonStyle.Danger),
	]);

	await interviewsChannel.send({ embeds: [embed], components: [actionRow] });

	const finalEmbed = new EmbedBuilder()
		.setColor(0x111111)
		.setDescription("Sent video to staff for approval!");
	await ctx.editReply({ embeds: [finalEmbed] });
});

const genYesID = command.addInteractionListener(
	"intvwYes",
	["interviewId"],
	async (ctx, args) => {
		await ctx.deferUpdate();

		const embed = EmbedBuilder.from(ctx.message.embeds[0]);
		embed.setColor("Green");

		await ctx.editReply({ components: [], embeds: [embed] });
		const chan = <TextChannel>(
			ctx.guild.channels.cache.get(channelIDs.interviews)
		);

		await prisma.submittedInterview.update({
			where: { id: +args.interviewId },
			data: { approved: true },
		});

		const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
			new ButtonBuilder()
				.setURL(embed.data.url!)
				.setLabel("View on YouTube")
				.setStyle(ButtonStyle.Link),
		]);
		await chan.send({
			content: `<@&${roles.topfeed.selectable.interviews}>`,
			components: [actionRow],
			embeds: [embed],
		});
	},
);

const genNoId = command.addInteractionListener("intvwNo", [], async (ctx) => {
	await ctx.deferUpdate();

	const embed = EmbedBuilder.from(ctx.message.embeds[0]);
	embed.setColor("Red");
	embed.setFooter({ text: `Rejected by ${ctx.user.tag}` });

	await ctx.editReply({ components: [], embeds: [embed] });
});

export default command;
