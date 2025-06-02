import {
	ActionRowBuilder,
	type ApplicationCommandData,
	ButtonBuilder,
	ButtonStyle,
	type Client,
	Collection,
	type Guild,
	type GuildMember,
	type Interaction,
	type Snowflake,
} from "discord.js";
import { roles } from "../Configuration/config";
import { CommandError } from "../Configuration/definitions";
import { ErrorHandler } from "./Errors";
import { EntrypointEvents } from "./Events";
import {
	type InteractionListener,
	type ListenerCustomIdGenerator,
	createInteractionListener,
} from "./ListenerInteraction";
import type { ReactionListener } from "./ListenerReaction";
import type { ReplyListener } from "./ListenerReply";
import {
	ApplicationData,
	InteractionHandlers,
	ReactionHandlers,
	ReplyHandlers,
} from "./data";

type OnBotReadyFunc = (guild: Guild, client: Client) => Promise<void> | void;

export abstract class InteractionEntrypoint<
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	HandlerType extends (...args: any[]) => Promise<unknown>,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	HandlerArgs extends any[] = [],
> {
	public interactionListeners = new Collection<
		string,
		InteractionListener<Readonly<string[]>>
	>();
	public reactionListeners = new Collection<string, ReactionListener>();
	public replyListeners = new Collection<string, ReplyListener>();

	public identifier: string;
	protected handler: HandlerType;
	public abstract commandData: ApplicationCommandData;

	private commandPermissions = new Collection<Snowflake, boolean>([
		[roles.staff, true],
	]);

	private onBotReadyFuncs: Array<OnBotReadyFunc> = [];

	public getPermissions() {
		return this.commandPermissions.clone();
	}

	public addPermission(id: Snowflake, permission: boolean) {
		this.commandPermissions.set(id, permission);
	}

	public clearPermissions() {
		this.commandPermissions = new Collection<Snowflake, boolean>();
	}

	setHandler(handler: HandlerType): this {
		this.handler = handler;
		return this;
	}

	addInteractionListener<const T extends Readonly<string[]>>(
		name: string,
		args: T,
		interactionHandler: ListenerCustomIdGenerator<T>,
	) {
		const [listenerName, listener, customIdGenerator] =
			createInteractionListener(name, args, interactionHandler);
		this.interactionListeners.set(listenerName, listener);
		return customIdGenerator;
	}
	addReactionListener(name: string, handler: ReactionListener): void {
		this.reactionListeners.set(name, handler);
	}

	addReplyListener(
		name: string,
		handler: ReplyListener,
	): ActionRowBuilder<ButtonBuilder> {
		this.replyListeners.set(name, handler);

		const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setCustomId(`##!!RL${name}RL!!##`)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true)
				.setEmoji("🚀"),
		);

		return actionRow;
	}

	abstract _run(
		ctx: Interaction,
		...HandlerArgs: HandlerArgs
	): Promise<unknown>;

	// Wraps the _run function to catch errors and ensure the handler has been registered
	async run(ctx: Interaction, ...HandlerArgs: HandlerArgs): Promise<void> {
		try {
			if (!this.handler)
				throw new Error(`Handler not registered for ${this.constructor.name}`);

			const member = ctx.member as GuildMember;
			if (!member) throw new Error("No member");

			const isStaffCommand =
				ctx.isChatInputCommand() && ctx.commandName === "staff";
			if (isStaffCommand && !member.roles.cache.has(roles.staff)) {
				throw new CommandError(
					"You don't have permission to use this command!",
				);
			}

			EntrypointEvents.emit("entrypointStarted", { entrypoint: this, ctx });
			await this._run(ctx, ...HandlerArgs);
			EntrypointEvents.emit("entrypointFinished", { entrypoint: this, ctx });
		} catch (e) {
			EntrypointEvents.emit("entrypointErrored", { entrypoint: this, ctx });
			ErrorHandler(ctx, e, this.identifier);
		}
	}

	async onBotReady(func: OnBotReadyFunc): Promise<void> {
		this.onBotReadyFuncs.push(func);
	}

	async runOnBotReady(guild: Guild, client: Client): Promise<void> {
		await Promise.all(this.onBotReadyFuncs.map((func) => func(guild, client)));
	}

	protected abstract _register(path: string[]): string;

	register(path: string[]): void {
		for (const [name, listener] of this.interactionListeners)
			InteractionHandlers.set(name, listener);
		for (const [name, listener] of this.reactionListeners)
			ReactionHandlers.set(name, listener);
		for (const [name, listener] of this.replyListeners)
			ReplyHandlers.set(name, listener);

		this.identifier = this._register(path);
	}

	static async registerAllCommands(guild: Guild): Promise<void> {
		try {
			await guild.commands.set(ApplicationData);
		} catch {
			//
		}

		// TODO: When Discord makes their permission system more granular
		// guild.commands.permissions.set()
	}
}
