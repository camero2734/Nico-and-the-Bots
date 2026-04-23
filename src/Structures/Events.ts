import Emittery from "emittery";
import type { SlashCommand } from "./EntrypointSlashCommand";

export const EntrypointEvents = new Emittery<{
  slashCommandFinished: {
    entrypoint: SlashCommand<any>;
    ctx: typeof SlashCommand.GenericContextType;
  };
}>();
