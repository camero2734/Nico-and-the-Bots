import type { Interaction } from "discord.js";
import Emittery from "emittery";
import type { WideEvent } from "../Helpers/logging/wide-event";
import type { InteractionEntrypoint } from "./EntrypointBase";
import type { SlashCommand } from "./EntrypointSlashCommand";

export const EntrypointEvents = new Emittery<{
  entrypointStarted: {
    entrypoint: InteractionEntrypoint<any, any>;
    ctx: Interaction;
    wideEvent: WideEvent;
  };
  entrypointFinished: {
    entrypoint: InteractionEntrypoint<any, any>;
    ctx: Interaction;
    wideEvent: WideEvent;
  };
  entrypointErrored: {
    entrypoint: InteractionEntrypoint<any, any>;
    ctx: Interaction;
    wideEvent: WideEvent;
    error: unknown;
  };
  slashCommandFinished: {
    entrypoint: SlashCommand<any>;
    ctx: typeof SlashCommand.GenericContextType;
  };
}>();
