import type { Interaction } from "discord.js";
import Emittery from "emittery";
import type { InteractionEntrypoint } from "./EntrypointBase";
import type { SlashCommand } from "./EntrypointSlashCommand";

export const EntrypointEvents = new Emittery<{
  entrypointStarted: {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    entrypoint: InteractionEntrypoint<any, any>;
    ctx: Interaction;
  };
  entrypointFinished: {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    entrypoint: InteractionEntrypoint<any, any>;
    ctx: Interaction;
  };
  entrypointErrored: {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    entrypoint: InteractionEntrypoint<any, any>;
    ctx: Interaction;
  };
  slashCommandFinished: {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    entrypoint: SlashCommand<any>;
    ctx: typeof SlashCommand.GenericContextType;
  };
}>();
