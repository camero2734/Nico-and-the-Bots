import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
	description: "Deletes a certain number of messages",
	options: [
		{
			name: "amount",
			description: "The number of messages to delete",
			required: true,
			type: ApplicationCommandOptionType.Integer,
		},
	],
});

command.setHandler(async (ctx) => {
	await ctx.deferReply({ ephemeral: true });

	const { amount } = ctx.opts;
	const channel = ctx.channel;

	if (amount > 100)
		throw new CommandError("You can only delete up to 100 messages at a time");

	const deleted = await channel.bulkDelete(amount, true);

	let numDeleted = deleted.size;

	// Need to manually fetch and delete remaining messages
	const remaining = amount - numDeleted;

	if (remaining > 0) {
		const fetched = await channel.messages.fetch({
			limit: Math.min(remaining, 100),
		});

		for (const m of fetched.values()) {
			await m.delete();
			await F.wait(750);
		}
		numDeleted += fetched.size;
	}

	const embed = new EmbedBuilder({
		description: `Deleted ${numDeleted} out of the requested ${amount} messages`,
	});
	await ctx.editReply({ embeds: [embed] });
});

export default command;
