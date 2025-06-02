import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../../Configuration/definitions";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const EditTypes = <const>["REPLACE", "ADD"];

const inputs = <const>[
	"credits",
	"score",
	"tokens",
	"steals",
	"blocks",
	"dailycount",
];

const command = new SlashCommand({
	description: "Edits a user's economy",
	options: [
		{
			name: "user",
			description: "The user whose economy you wish to edit",
			required: true,
			type: ApplicationCommandOptionType.User,
		},
		{
			name: "type",
			description:
				"IMPORTANT: Whether to REPLACE or ADD these values to the econ",
			required: true,
			type: ApplicationCommandOptionType.String,
			choices: EditTypes.map((t) => ({ name: t, value: t })),
		},
		...inputs.map(
			(name) =>
				<const>{
					name,
					description: `Value of ${name} to add or replace`,
					required: false,
					type: ApplicationCommandOptionType.Integer,
				},
		),
	],
});

command.setHandler(async (ctx) => {
	await ctx.deferReply();
	const { user, type, credits, score, tokens, steals, blocks, dailycount } =
		ctx.opts;
	const amountField = (n: number | undefined) => {
		if (n === undefined) return undefined;

		return type === "ADD" ? { increment: n } : n;
	};

	const member = await ctx.guild.members.fetch(user);
	if (!member) throw new CommandError("Couldn't find that member");

	const embed = new EmbedBuilder()
		.setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
		.setColor(member.displayColor)
		.setTitle("Edit successful");

	await prisma.$transaction(async (tx) => {
		const result = await tx.user.update({
			where: { id: user },
			data: {
				credits: amountField(credits),
				score: amountField(score),
				dailyBox: {
					update: {
						tokens: amountField(tokens),
						steals: amountField(steals),
						blocks: amountField(blocks),
						dailyCount: amountField(dailycount),
					},
				},
			},
			include: { dailyBox: true },
		});

		for (const v of <const>["credits", "score"]) {
			const value = result[v] as number;
			if (value < 0)
				throw new CommandError(
					`These actions would cause ${v} to go negative.`,
				);

			embed.addFields([{ name: v, value: `${value}`, inline: true }]);
		}

		for (const v of <const>["steals", "blocks", "tokens", "dailyCount"]) {
			const value = result.dailyBox?.[v] as number;
			if (value < 0)
				throw new CommandError(
					`These actions would cause ${v} to go negative.`,
				);

			embed.addFields([{ name: v, value: `${value}`, inline: true }]);
		}
	});

	await ctx.editReply({ embeds: [embed] });
});

export default command;
