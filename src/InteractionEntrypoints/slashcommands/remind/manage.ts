import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type GuildMember,
	type MessageActionRowComponentBuilder,
	SelectMenuBuilder,
	SelectMenuOptionBuilder,
} from "discord.js";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { formatReminderDate } from "./_consts";

enum ActionTypes {
	SelectReminder = 0,
	ShowList = 1,
	DeleteReminder = 2,
}

const command = new SlashCommand({
	description: "Presents a list of your reminders",
	options: [],
});

command.setHandler(async (ctx) => {
	await ctx.deferReply({ ephemeral: true });

	const [embed, actionRow] = await generateReminderList(ctx.member);

	await ctx.send({
		embeds: [embed.toJSON()],
		components: actionRow ? [actionRow] : undefined,
	});
});

// Main list
async function generateReminderList(
	member: GuildMember,
): Promise<
	| [EmbedBuilder]
	| [EmbedBuilder, ActionRowBuilder<MessageActionRowComponentBuilder>]
> {
	const reminders = await prisma.reminder.findMany({
		where: { userId: member.id },
		orderBy: { sendAt: "asc" },
	});

	if (reminders.length < 1) {
		return [
			new EmbedBuilder({
				description:
					"You don't have any reminders! Create one using `/remind new`",
			}),
		];
	}

	const selectMenu = new SelectMenuBuilder()
		.setCustomId(
			genActionId({
				reminderId: "void",
				actionType: ActionTypes.SelectReminder.toString(),
			}),
		)
		.setPlaceholder("Select a reminder for more information");

	const emojis = await member.guild.emojis.fetch();

	for (const r of reminders) {
		const emoji = emojis.random();

		const label = r.text.substring(0, 25);
		const description = formatReminderDate(r.sendAt).substring(0, 50);
		selectMenu.addOptions([
			new SelectMenuOptionBuilder({
				label,
				description,
				emoji: { id: emoji?.id },
				value: `${r.id}`,
			}).toJSON(),
		]);
	}

	const actionRow =
		new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
			selectMenu,
		]);
	const embed = new EmbedBuilder()
		.setTitle("Your reminders")
		.setDescription(
			"You may view your reminders in the list below. Selecting one will open a new menu with more information, as well as the ability to delete the reminder.",
		);

	return [embed, actionRow];
}

const genArgs = <const>["actionType", "reminderId"];
const genActionId = command.addInteractionListener(
	"remindManage",
	genArgs,
	async (ctx, args) => {
		const actionType = +args.actionType;
		ctx.deferred = true;

		console.log(`Got ${actionType}`, args);

		if (actionType === ActionTypes.ShowList) {
			const [embed, actionRow] = await generateReminderList(ctx.member);
			await ctx.editReply({
				embeds: [embed],
				components: actionRow ? [actionRow] : undefined,
			});
			return;
		}
		if (actionType === ActionTypes.DeleteReminder) {
			console.log("delete", /SELECT/);
			if (!ctx.isButton()) return;
			ctx.deferred = true;

			const id = +args.reminderId;
			if (!id) return;

			const reminder = await prisma.reminder.findUnique({ where: { id } });
			if (!reminder || reminder.userId !== ctx.member.id) return;

			// Delete reminder
			await prisma.reminder.delete({ where: { id } });

			const embed = new EmbedBuilder()
				.setTitle("Deleted reminder")
				.setDescription("Your reminder has been deleted.")
				.addFields([{ name: "Text", value: reminder.text }]);

			await ctx.editReply({ embeds: [embed], components: [] });
		} else if (actionType === ActionTypes.SelectReminder) {
			if (!ctx.isSelectMenu()) return;
			const id = +ctx.values[0];
			if (!id || Number.isNaN(id)) return;

			const reminder = await prisma.reminder.findUnique({ where: { id } });
			if (!reminder || reminder.userId !== ctx.member.id) return;

			const sendTS = F.discordTimestamp(reminder.sendAt, "longDateTime");
			const sendTSRelative = F.discordTimestamp(reminder.sendAt, "relative");
			const madeTS = F.discordTimestamp(reminder.createdAt, "longDateTime");

			const reminderBody = reminder.text.substring(250);
			const reminderTitle =
				reminderBody === ""
					? reminder.text
					: `${reminder.text.substring(0, 250)}...`;

			const embed = new EmbedBuilder()
				.setTitle(reminderTitle)
				.addFields([
					{ name: "Sending", value: `${sendTS} (${sendTSRelative})` },
				])
				.addFields([{ name: "Created", value: madeTS }]);

			if (reminderBody !== "") embed.setDescription(`...${reminderBody}`);

			const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
				new ButtonBuilder()
					.setLabel("Back to List")
					.setStyle(ButtonStyle.Primary)
					.setCustomId(
						genActionId({
							reminderId: "void",
							actionType: ActionTypes.ShowList.toString(),
						}),
					),
				new ButtonBuilder()
					.setLabel("Delete Reminder")
					.setStyle(ButtonStyle.Danger)
					.setCustomId(
						genActionId({
							reminderId: reminder.id.toString(),
							actionType: ActionTypes.DeleteReminder.toString(),
						}),
					),
			]);

			await ctx.editReply({ components: [actionRow], embeds: [embed] });
		}
	},
);

export default command;
