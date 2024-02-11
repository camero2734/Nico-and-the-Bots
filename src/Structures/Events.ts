/* eslint-disable @typescript-eslint/no-explicit-any */
import Emittery from "emittery";
import { InteractionEntrypoint } from "./EntrypointBase";
import { SlashCommand } from "./EntrypointSlashCommand";
import { Interaction } from "discord.js";

export const EntrypointEvents = new Emittery<{
    entrypointStarted: { entrypoint: InteractionEntrypoint<any, any>; ctx: Interaction };
    entrypointFinished: { entrypoint: InteractionEntrypoint<any, any>; ctx: Interaction };
    entrypointErrored: { entrypoint: InteractionEntrypoint<any, any>; ctx: Interaction };
    slashCommandFinished: { entrypoint: SlashCommand<any>; ctx: typeof SlashCommand.GenericContextType };
}>();
