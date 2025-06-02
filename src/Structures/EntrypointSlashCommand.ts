/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	ActionRowBuilder,
	type ApplicationCommandOptionData,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type BaseMessageOptions,
	ButtonBuilder,
	type ButtonComponent,
	ButtonStyle,
	type ChatInputApplicationCommandData,
	Collection,
	type CommandInteractionOptionResolver,
	ComponentType,
	type Guild,
	type GuildMember,
	type Interaction,
	type Message,
	type MessagePayload,
	type Snowflake,
	type TextChannel,
	type ChatInputCommandInteraction,
} from "discord.js";
import R from "ramda";
import { emojiIDs } from "../Configuration/config";
import F from "../Helpers/funcs";
import { prisma } from "../Helpers/prisma-init";
import { InteractionEntrypoint } from "./EntrypointBase";
import { EntrypointEvents } from "./Events";
import type {
	AutocompleteListener,
	AutocompleteNameOption,
} from "./ListenerAutocomplete";
import {
	type CommandOptions,
	type OptsType,
	type SlashCommandData,
	extractOptsFromInteraction,
} from "./SlashCommandOptions";
import { ApplicationData, SlashCommands } from "./data";

type SlashCommandInteraction<T extends CommandOptions = []> =
	ChatInputCommandInteraction & {
		opts: OptsType<SlashCommandData<T>>;
		member: GuildMember;
		channel: TextChannel;
		guild: Guild;
		guildId: Snowflake;
		send(
			payload: BaseMessageOptions & { ephemeral?: boolean },
		): Promise<Message | void>;
	};
type SlashCommandHandler<T extends CommandOptions = []> = (
	ctx: SlashCommandInteraction<T>,
) => Promise<unknown>;

export class SlashCommand<
	const T extends CommandOptions = [],
> extends InteractionEntrypoint<
	SlashCommandHandler<T>,
	[OptsType<SlashCommandData<T>>]
> {
	public commandIdentifier: string;
	public commandData: ChatInputApplicationCommandData;

	static GenericContextType: SlashCommandInteraction;
	public ContextType: SlashCommandInteraction<T>;

	public autocompleteListeners = new Collection<
		string,
		AutocompleteListener<
			OptsType<SlashCommandData<T>>,
			SlashCommandData<T>["options"]
		>
	>();

	constructor(commandData: SlashCommandData<T>) {
		super();
		const defaults: Partial<ChatInputApplicationCommandData> = {
			type: ApplicationCommandType.ChatInput,
		};
		this.commandData = (<unknown>{
			...commandData,
			...defaults,
		}) as ChatInputApplicationCommandData;
	}

	addAutocompleteListener(
		name: AutocompleteNameOption<SlashCommandData<T>["options"]>,
		handler: AutocompleteListener<
			OptsType<SlashCommandData<T>>,
			SlashCommandData<T>["options"]
		>,
	): void {
		if (typeof name !== "string") throw new Error("Name must be a string");
		this.autocompleteListeners.set(name, handler);
	}

	async _run(
		interaction: Interaction,
		opts?: OptsType<SlashCommandData<T>>,
	): Promise<void> {
		const ctx = interaction as SlashCommandInteraction<T>;

		if (!ctx.isCommand()) return;

		ctx.send = async (payload) => {
			if (ctx.replied || ctx.deferred)
				return ctx.editReply(payload) as Promise<Message>;
			else
				return ctx.reply(
					payload as unknown as MessagePayload,
				) as unknown as Promise<Message<boolean>>;
		};
		ctx.opts =
			opts ||
			(extractOptsFromInteraction(interaction as Interaction) as OptsType<
				SlashCommandData<T>
			>);

		await this.handler(ctx);
		EntrypointEvents.emit("slashCommandFinished", { entrypoint: this, ctx });
	}

	_register(path: string[]): string {
		const possibleSteps = <const>[
			["COMMAND"],
			["COMMAND", "SUBCOMMAND"],
			["COMMAND", "SUBCOMMAND_GROUP", "SUBCOMMAND"],
		];
		const steps = R.zip(possibleSteps[path.length - 1], path);

		const commandData = this
			.commandData as unknown as ChatInputApplicationCommandData;

		const data = ApplicationData;
		let command = {} as ChatInputApplicationCommandData;
		let subcommandGroup: ApplicationCommandOptionData | undefined;
		for (const [index, [step, value]] of steps.entries()) {
			const isLast = index === steps.length - 1;
			if (step === "COMMAND") {
				const foundCommand = data.find(
					(p) => p.name === value,
				) as ChatInputApplicationCommandData;
				command = foundCommand || {
					description: value,
					options: [],
					...(isLast ? commandData : {}),
					name: value,
					type: ApplicationCommandType.ChatInput,
				};
				if (!foundCommand) data.push(command);
			} else if (step === "SUBCOMMAND_GROUP") {
				const foundSubcommandGroup = command.options?.find(
					(o) => o.name === value,
				);
				subcommandGroup = foundSubcommandGroup || {
					name: value,
					description: value,
					options: [],
					type: ApplicationCommandOptionType.SubcommandGroup,
				};
				const options = command.options as ApplicationCommandOptionData[];
				if (!foundSubcommandGroup) options?.push(subcommandGroup);
			} else if (step === "SUBCOMMAND") {
				const parent = (subcommandGroup ||
					command) as ChatInputApplicationCommandData;
				if (parent.options?.some((o) => o.name === value)) continue;

				const options = parent.options as ApplicationCommandOptionData[];
				options?.push({
					description: "Not provided",
					...(isLast ? commandData : {}),
					name: value,
					type: ApplicationCommandOptionType.Subcommand,
				} as ApplicationCommandOptionData);
			}
		}

		const id = path.join(":");
		SlashCommands.set(id, this as unknown as SlashCommand<[]>);

		return id;
	}

	upvoteDownVoteListener(name: string) {
		const gen = this.addInteractionListener(
			`${name}&updn`,
			["isUpvote", "pollID"],
			async (ctx, args) => {
				if (!ctx.isButton()) return;

				await ctx.deferUpdate();

				const isUpvote = args.isUpvote === "1" ? 1 : 0;
				const pollId = +args.pollID;
				await prisma.vote.upsert({
					where: { pollId_userId: { userId: ctx.user.id, pollId } },
					create: { pollId, userId: ctx.user.id, choices: [isUpvote] },
					update: { choices: [isUpvote] },
				});

				const msg = ctx.message as Message;
				const poll = await prisma.poll.findUnique({
					where: { id: pollId },
					include: { votes: true },
				});
				const [actionRow] = msg.components || [];
				if (!actionRow || !poll) return;

				let upvotes = 0;
				for (const vote of poll.votes) {
					if (vote.choices[0] === 1) upvotes++;
				}
				const downvotes = poll.votes.length - upvotes;

				// If the post is heavily downvoted
				if (downvotes >= Math.max(5, upvotes)) {
					await msg.delete();
					await prisma.poll.delete({ where: { id: poll.id } });
					return;
				}

				const getMessageButtonWithEmoji = (
					name: string,
				): ButtonBuilder | undefined => {
					if (actionRow.type !== ComponentType.ActionRow) return;
					const btn = actionRow.components.find(
						(c) =>
							c.type === ComponentType.Button &&
							c.emoji?.name?.startsWith(name),
					) as ButtonComponent;
					return ButtonBuilder.from(btn);
				};
				const upvoteButton = getMessageButtonWithEmoji("upvote");
				const downvoteButton = getMessageButtonWithEmoji("downvote");
				if (!upvoteButton || !downvoteButton) return; // prettier-ignore

				if (isUpvote) upvoteButton.setStyle(ButtonStyle.Success);
				else downvoteButton.setStyle(ButtonStyle.Danger);

				upvoteButton.setLabel(`${upvotes}`);
				downvoteButton.setLabel(`${downvotes}`);

				await ctx.editReply({ components: [actionRow] });

				await F.wait(1000);

				upvoteButton.setStyle(ButtonStyle.Secondary);
				downvoteButton.setStyle(ButtonStyle.Secondary);

				await ctx.editReply({ components: [actionRow] });
			},
		);

		const createActionRow = async (
			ctx: SlashCommandInteraction<T> | Message,
			title?: string,
		) => {
			const poll = await prisma.poll.create({
				data: {
					userId: ctx.member?.id,
					name: title || `${name}-${Date.now()}`,
					options: ["downvote", "upvote"],
				},
			});

			return new ActionRowBuilder<ButtonBuilder>().setComponents([
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel("0")
					.setCustomId(gen({ isUpvote: "1", pollID: `${poll.id}` }))
					.setEmoji({ id: emojiIDs.upvote }),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel("0")
					.setCustomId(gen({ isUpvote: "0", pollID: `${poll.id}` }))
					.setEmoji({ id: emojiIDs.downvote }),
			]);
		};

		return createActionRow;
	}

	static getIdentifierFromInteraction(interaction: Interaction): string {
		if (!("options" in interaction)) return "";

		const optionResolver =
			interaction.options as CommandInteractionOptionResolver;
		const subcommandGroup = optionResolver.getSubcommandGroup(false);
		const subcommand = optionResolver.getSubcommand(false);

		return [interaction.commandName, subcommandGroup, subcommand]
			.filter((s) => s)
			.join(":");
	}
}
