/* eslint-disable @typescript-eslint/no-explicit-any */
import Emittery from "emittery";
import type { InteractionEntrypoint } from "./EntrypointBase";
import type { SlashCommand } from "./EntrypointSlashCommand";
import type { Interaction } from "discord.js";

export const EntrypointEvents = new Emittery<{
	entrypointStarted: {
		entrypoint: InteractionEntrypoint<any, any>;
		ctx: Interaction;
	};
	entrypointFinished: {
		entrypoint: InteractionEntrypoint<any, any>;
		ctx: Interaction;
	};
	entrypointErrored: {
		entrypoint: InteractionEntrypoint<any, any>;
		ctx: Interaction;
	};
	slashCommandFinished: {
		entrypoint: SlashCommand<any>;
		ctx: typeof SlashCommand.GenericContextType;
	};
}>();
