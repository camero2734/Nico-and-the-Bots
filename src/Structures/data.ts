/* eslint-disable @typescript-eslint/ban-types */
import { ApplicationCommandData, Collection } from "discord.js";
import { ContextMenu } from "./EntrypointContextMenu";
import { SlashCommand } from "./EntrypointSlashCommand";
import { InteractionListener } from "./ListenerInteraction";
import { ReactionListener } from "./ListenerReaction";
import { ReplyListener } from "./ListenerReply";

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
