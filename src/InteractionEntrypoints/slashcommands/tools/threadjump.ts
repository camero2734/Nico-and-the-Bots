import {
	ActionRowBuilder,
	AnyThreadChannel,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { CommandError } from "../../../Configuration/definitions";

const command = new SlashCommand({
	description: "Sends a link to the first message in the thread",
	options: [],
});

command.setHandler(async (ctx) => {
	await ctx.deferReply({ ephemeral: true });

	const thread = ctx.channel as unknown as AnyThreadChannel;

	if (!thread.isThread()) {
		throw new CommandError("This command can only be used in a thread");
	}

	const msg = await thread.messages
		.fetch({
			limit: 1,
			after: thread.id,
			cache: false,
		})
		.then((messages) => messages.first())
		.catch(() => null);

	if (!msg) {
		throw new CommandError("Failed to fetch the thread's starter message");
	}

	const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
		new ButtonBuilder()
			.setLabel("Jump to message")
			.setURL(msg.url)
			.setStyle(ButtonStyle.Link),
	);

	await ctx.editReply({
		content: "Here's the link to the first message in this thread",
		components: [actionRow],
	});
});

export default command;
