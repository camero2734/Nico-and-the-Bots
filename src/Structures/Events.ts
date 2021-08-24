/* eslint-disable @typescript-eslint/no-explicit-any */
import { Interaction } from "discord.js";
import Emittery from "emittery";
import { InteractionEntrypoint } from "./EntrypointBase";
import { SlashCommand } from "./EntrypointSlashCommand";

export const EntrypointEvents = new Emittery<{
    entrypointStarted: { entrypoint: InteractionEntrypoint<any, any>; ctx: Interaction };
    entrypointCompleted: { entrypoint: InteractionEntrypoint<any, any>; ctx: Interaction };
    entrypointErrored: { entrypoint: InteractionEntrypoint<any, any>; ctx: Interaction };
    slashCommandCompleted: { entrypoint: SlashCommand<any>; ctx: typeof SlashCommand.GenericContextType };
}>();
