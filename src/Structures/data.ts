/* eslint-disable @typescript-eslint/ban-types */
import { type ApplicationCommandData, Collection } from "discord.js";
import type { ContextMenu } from "./EntrypointContextMenu";
import type { SlashCommand } from "./EntrypointSlashCommand";
import type { InteractionListener } from "./ListenerInteraction";
import type { ReactionListener } from "./ListenerReaction";
import type { ReplyListener } from "./ListenerReply";

export const SlashCommands = new Collection<string, SlashCommand<[]>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ContextMenus = new Collection<string, ContextMenu<any>>();
export const InteractionHandlers = new Collection<
	string,
	InteractionListener
>();
export const ReactionHandlers = new Collection<string, ReactionListener>();
export const ReplyHandlers = new Collection<string, ReplyListener>();

export const ApplicationData: ApplicationCommandData[] = [];
