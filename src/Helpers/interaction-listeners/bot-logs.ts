import { EmbedBuilder } from "discord.js";
import { createInteractionListener } from "../../Structures/ListenerInteraction";

const [name, interaction, genCustomId] = createInteractionListener(
	"botLog",
	[],
	async (ctx) => {
		await ctx.editReply({ components: [] });

		const thread = await ctx.message.startThread({
			name: "Information Request",
			autoArchiveDuration: 60,
			reason: `${ctx.member.displayName} requested`,
		});

		await thread.send({
			embeds: [
				new EmbedBuilder({
					description: `${ctx.member} requested more information about this item`,
				}),
			],
		});
	},
);

export const BotLogInteractionListener = { name, interaction, genCustomId };
