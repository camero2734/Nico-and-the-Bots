import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	AttachmentBuilder,
	ButtonBuilder,
	type ButtonComponent,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	type GuildMember,
	type GuildMemberRoleManager,
	MentionableSelectMenuBuilder,
	type MessageActionRowComponentBuilder,
	type MessageComponentInteraction,
	type OverwriteData,
	RoleSelectMenuBuilder,
	type Snowflake,
	StringSelectMenuBuilder,
	type TextChannel,
	UserSelectMenuBuilder,
} from "discord.js";
import fetch from "node-fetch";
import { categoryIDs, channelIDs, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { MessageTools } from "../../../Helpers";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import type { ListenerInteraction } from "../../../Structures/ListenerInteraction";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";

const command = new SlashCommand({
	description:
		"Adds user(s) to a jail channel and removes their ability to view all other channels",
	options: [
		{
			name: "user",
			description: "The user to jail",
			required: true,
			type: ApplicationCommandOptionType.User,
		},
		...[2, 3, 4, 5].map(
			(num) =>
				<const>{
					name: `user${num}`,
					description: "An additional user to jail",
					required: false,
					type: ApplicationCommandOptionType.User,
				},
		),
		{
			name: "explanation",
			description: "The reason the jail is being created",
			required: false,
			type: ApplicationCommandOptionType.String,
		},
	],
});

enum ActionTypes {
	UNMUTE_ALL = 0,
	REMUTE_ALL = 1,
	CLOSE_JAIL = 2,
}

command.setHandler(async (ctx) => {
	const { explanation, ...usersDict } = ctx.opts;
	const ids = Object.values(usersDict) as Snowflake[];

	const members = await Promise.all(
		ids.map((id) => ctx.member.guild.members.fetch(id)),
	);

	if (
		members.some(
			(m) =>
				m.roles.highest.comparePositionTo(ctx.member.roles.highest) >= 0 ||
				m.user.bot,
		)
	) {
		throw new CommandError(
			"You cannot jail bots or someone of equal or higher role.",
		);
	}

	const names = members
		.map((member) =>
			member.displayName.replace(/[^A-z0-9]/g, "").substring(0, 10),
		)
		.join("-");
	const mentions = members.map((member) => member.toString());

	// Setup permissions in new channel
	const permissionOverwrites: OverwriteData[] = [
		{
			deny: ["ViewChannel"],
			id: ctx.guildId,
		},
		{
			allow: ["ViewChannel", "SendMessages"],
			id: roles.staff, // Staff
		},
		{
			allow: ["ViewChannel", "SendMessages", "ManageChannels"],
			id: roles.bots, // Bots
		},
		{
			deny: ["SendMessages"],
			id: roles.muted, // Muted
		},
	];

	for (const member of members) {
		permissionOverwrites.push({ allow: ["ViewChannel"], id: member.user.id });
		if (member.roles.cache.has(roles.deatheaters)) {
			await member.roles.remove(roles.deatheaters);
			await member.roles.add(roles.formerde);
		}
		await member.roles.add(roles.muted);
		await member.roles.add(roles.hideallchannels);
	}

	// Create channel
	const jailChan = await ctx.member.guild.channels.create({
		name: `jail-${names}`,
		type: ChannelType.GuildText,
		permissionOverwrites,
	});

	// Put channel in correct category
	await jailChan.setParent(categoryIDs.chilltown, { lockPermissions: false });

	// Send a message there
	const jailEmbed = new EmbedBuilder()
		.setDescription(
			"You have been added to jail, which means your conduct has fallen below what is expected of this server.\n\n**Please wait for a staff member.**",
		) // prettier-ignore
		.addFields([
			{
				name: "Note for staff",
				value:
					"All users are muted by default. You can `/staff unmute` them individually or press the Unmute Users button below.",
			},
		]);

	if (explanation)
		jailEmbed.addFields([{ name: "Initial explanation", value: explanation }]);

	jailEmbed.addFields([
		{ name: "Jailed", value: F.discordTimestamp(new Date(), "relative") },
	]);

	const jailActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
		new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel("Unmute Users")
			.setCustomId(
				genActionId({
					// Compresses user ids to base64 and as an array
					base64idarray: members
						.map((m) => F.snowflakeToRadix64(m.user.id))
						.join(","),
					actionType: ActionTypes.UNMUTE_ALL.toString(),
				}),
			),
		new ButtonBuilder()
			.setStyle(ButtonStyle.Danger)
			.setLabel("Close channel")
			.setCustomId(
				genActionId({
					base64idarray: members
						.map((m) => F.snowflakeToRadix64(m.user.id))
						.join(","),
					actionType: ActionTypes.CLOSE_JAIL.toString(),
				}),
			),
	]);

	const m = await jailChan.send({
		content: `${mentions.join(" ")}`,
		embeds: [jailEmbed],
		components: [jailActionRow],
	});

	const commandEmbed = new EmbedBuilder()
		.setAuthor({
			name: members[0].displayName,
			iconURL: members[0].user.displayAvatarURL(),
		})
		.setTitle(`${members.length} user${members.length === 1 ? "" : "s"} jailed`)
		.addFields([{ name: "Users", value: mentions.join("\n") }]);

	const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setLabel("View channel")
			.setURL(m.url),
	]);
	await ctx.send({ embeds: [commandEmbed], components: [actionRow] });
});

type ActionExecutorArgs = {
	base64idarray: string;
	staffMember: GuildMember;
	jailedMembers: GuildMember[];
};

const intArgs = <const>["actionType", "base64idarray"];
const genActionId = command.addInteractionListener(
	"jailunmuteall",
	intArgs,
	async (ctx, args) => {
		const base64idarray = args.base64idarray;

		await ctx.deferReply();

		// Staff only
		const staffMember = await ctx.guild.members.fetch(ctx.user.id);
		if (!staffMember?.roles.cache.has(roles.staff)) return;

		// Decode users info
		const users = base64idarray.split(",").map(F.radix64toSnowflake);
		const jailedMembers = await Promise.all(
			users.map((id) => ctx.guild.members.fetch(id)),
		);

		switch (+args.actionType) {
			case ActionTypes.UNMUTE_ALL:
				unmuteAllUsers(ctx, { staffMember, jailedMembers, base64idarray });
				break;
			case ActionTypes.CLOSE_JAIL:
				closeChannel(ctx, { staffMember, jailedMembers, base64idarray });
				break;
			case ActionTypes.REMUTE_ALL:
				muteAllUsers(ctx, { staffMember, jailedMembers, base64idarray });
				break;
			default:
				return;
		}
	},
);

async function unmuteAllUsers(
	ctx: ListenerInteraction,
	args: ActionExecutorArgs,
): Promise<void> {
	// Remove roles
	for (const member of args.jailedMembers) {
		await member.roles.remove(roles.muted);
	}

	const replyEmbed = new EmbedBuilder({
		description: `${args.staffMember} unmuted all users`,
	});
	await ctx.followUp({ embeds: [replyEmbed.toJSON()] });

	// Change button to mute
	const msg = ctx.message;
	const [actionRow] = msg.components;

	if (actionRow.type !== ComponentType.ActionRow)
		throw new CommandError("Invalid action row");
	const newComponents = actionRow.components.map((c) => {
		if (c.type === ComponentType.StringSelect)
			return StringSelectMenuBuilder.from(c);
		if (c.type === ComponentType.UserSelect)
			return UserSelectMenuBuilder.from(c);
		if (c.type === ComponentType.RoleSelect)
			return RoleSelectMenuBuilder.from(c);
		if (c.type === ComponentType.MentionableSelect)
			return MentionableSelectMenuBuilder.from(c);
		if (c.type === ComponentType.ChannelSelect)
			return ChannelSelectMenuBuilder.from(c);
		if (c.type !== ComponentType.Button || c.label !== "Unmute Users")
			return ButtonBuilder.from(c);

		return ButtonBuilder.from(c as ButtonComponent)
			.setCustomId(
				genActionId({
					base64idarray: args.base64idarray,
					actionType: ActionTypes.REMUTE_ALL.toString(),
				}),
			)
			.setLabel("Remute Users");
	});

	await msg.edit({
		components: [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
				newComponents,
			),
		],
	});
}

async function muteAllUsers(
	ctx: ListenerInteraction,
	args: ActionExecutorArgs,
): Promise<void> {
	// Add roles
	for (const member of args.jailedMembers) {
		await member.roles.add(roles.muted);
	}

	const replyEmbed = new EmbedBuilder({
		description: `${args.staffMember} remuted all users`,
	});
	await ctx.followUp({ embeds: [replyEmbed.toJSON()] });

	// Change button to unmute
	const msg = ctx.message;
	const [actionRow] = msg.components;

	if (actionRow.type !== ComponentType.ActionRow)
		throw new CommandError("Invalid action row");
	const newComponents = actionRow.components.map((c) => {
		if (c.type === ComponentType.StringSelect)
			return StringSelectMenuBuilder.from(c);
		if (c.type === ComponentType.UserSelect)
			return UserSelectMenuBuilder.from(c);
		if (c.type === ComponentType.RoleSelect)
			return RoleSelectMenuBuilder.from(c);
		if (c.type === ComponentType.MentionableSelect)
			return MentionableSelectMenuBuilder.from(c);
		if (c.type === ComponentType.ChannelSelect)
			return ChannelSelectMenuBuilder.from(c);
		if (c.type !== ComponentType.Button) return c;

		return ButtonBuilder.from(c as ButtonComponent)
			.setCustomId(
				genActionId({
					base64idarray: args.base64idarray,
					actionType: ActionTypes.UNMUTE_ALL.toString(),
				}),
			)
			.setLabel("Unmute Users");
	});

	await msg.edit({
		components: [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
				newComponents,
			),
		],
	});
}

async function closeChannel(
	ctx: ListenerInteraction,
	args: ActionExecutorArgs,
): Promise<void> {
	let cancelled = false;
	let finished = false;

	// Create cancel button, send warning message
	const msg = ctx.message;
	const chan = msg.channel as TextChannel;
	const [actionRow] = msg.components;

	if (actionRow.type !== ComponentType.ActionRow)
		throw new CommandError("Invalid action row");
	const button = actionRow.components.find(
		(btn) => btn.customId === ctx.customId,
	);
	if (!button) return;

	await msg.edit({ components: [] });

	// prettier-ignore
	const warningEmbed = new EmbedBuilder()
		.setDescription(
			"This channel is currently being archived. Once that is done, the channel will be deleted. You may cancel this by pressing the cancel button within the next 2 minutes.",
		)
		.setColor(0xff0000)
		.addFields([{ name: "Closed by", value: `${args.staffMember}` }]);

	const m = await chan.send({ embeds: [warningEmbed] });

	const timedListener = new TimedInteractionListener(m, <const>["cancelId"]);
	const [cancelId] = timedListener.customIDs;

	const cancelActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
		new ButtonBuilder()
			.setLabel("Cancel")
			.setCustomId(cancelId)
			.setStyle(ButtonStyle.Danger),
	]);

	await m.edit({ components: [cancelActionRow] });

	const filter = (interaction: MessageComponentInteraction) => {
		const memRoles = interaction.member?.roles as GuildMemberRoleManager;
		return memRoles?.cache.has(roles.staff);
	};

	timedListener.wait(120 * 1000, filter).then(([buttonPressed]) => {
		if (buttonPressed === cancelId) {
			cancelled = true;
			m.delete();
			msg.edit({ components: [actionRow] }); // Restore to previous state
		} else if (!finished) {
			m.edit({ components: [] }); // Cancellation will happen no matter what
		}
	});

	// Create a backup of messages in the channel
	const messages = await MessageTools.fetchAllMessages(chan);
	let html =
		"<head>\n  <style>\n    body {background-color: #36393f}\n  	.avatar {border-radius: 100%; }\n    .timestamp {font-size: 10px; color: #777777}\n    .textcontent {font-size: 12px; color: white}\n    .username {color: white; font-size: 30px}\n  </style>\n</head>";

	const reverseMessages = [...messages.values()].reverse();
	for (const message of reverseMessages) {
		if (
			!message.content &&
			!message.attachments &&
			!message.embeds?.[0]?.description
		)
			continue;
		let mhtml = "";

		const displayName =
			message.member?.displayName || `${message.author.id} (left server)`;
		const content = message.content || message.embeds?.[0]?.description;

		mhtml += `<img class="avatar" src="${message.author.displayAvatarURL()}" align="left" height=40/><span class="username"><b>${displayName}</b></span>  <span class="timestamp">(${
			message.author.id
		})</span>\n`;
		mhtml += `<p display="inline" class="timestamp"> ${message.createdAt
			.toString()
			.replace(
				"Central Standard Time",
				message.createdTimestamp.toString(),
			)} </p>\n`;
		if (content) {
			mhtml += `<p class="textcontent">${fixEmojis(content)}</p>`;
		}
		if (message.attachments) {
			const attachments = [...message.attachments.values()];
			for (const a of attachments) {
				if (
					a.name?.endsWith("png") ||
					a.name?.endsWith("gif") ||
					a.name?.endsWith("jpg")
				) {
					const _file = await fetch(a.url);
					const base64 = (await _file.buffer()).toString("base64");
					mhtml += `\n<img src="data:image/jpeg;base64,${base64}"><br><br>`;
				}
			}
		}
		html += `<div>\n${mhtml}\n</div><br>\n`;
	}

	const attachment = new AttachmentBuilder(Buffer.from(html), {
		name: `${chan.name}.html`,
	});

	if (cancelled) return; // Don't send anything

	const finalM = await chan.send({
		embeds: [
			new EmbedBuilder({
				description: `Fetched ${messages.size} messages. The channel will be deleted in 30 seconds unless cancelled.`,
			}),
		],
	});
	await F.wait(30 * 1000);
	if (cancelled) {
		await finalM.delete();
		return;
	} else finished = true;
	// No turning back now
	await chan.send("Sending channel archive...");

	const embed = new EmbedBuilder()
		.setTitle("Jail Channel Backup")
		.addFields([
			{
				name: "Users",
				value: args.jailedMembers.map((m) => m.toString()).join("\n"),
			},
		])
		.addFields([{ name: "Date", value: new Date().toString() }]);

	const backupChannel = ctx.guild.channels.cache.get(
		channelIDs.jaillog,
	) as TextChannel;
	await backupChannel.send({ embeds: [embed], files: [attachment] });

	// DM members the backup too
	for (const member of args.jailedMembers) {
		const dm = await member.createDM();
		if (!dm) continue;

		await dm.send({ embeds: [embed], files: [attachment] });
	}

	// await chan.delete();
}

function fixEmojis(text: string) {
	const regCapture = /<(a{0,1}):\w+:(\d{18})>/;
	let finalText = text;
	while (regCapture.test(finalText)) {
		const results = regCapture.exec(finalText) || [];
		const ending = results[1] && results[1] === "a" ? "gif" : "png";
		const id = results[2];
		const newText = `<img src="https://cdn.discordapp.com/emojis/${id}.${ending}" height=20>`;
		finalText = finalText.replace(regCapture, newText);
	}
	return finalText;
}

export default command;
