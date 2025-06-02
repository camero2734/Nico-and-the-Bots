import { type ApplicationCommandData, Collection } from "discord.js";
import type { ContextMenu, TargetTypes } from "./EntrypointContextMenu";
import type { SlashCommand } from "./EntrypointSlashCommand";
import type { InteractionListener } from "./ListenerInteraction";
import type { ReactionListener } from "./ListenerReaction";
import type { ReplyListener } from "./ListenerReply";

export const SlashCommands = new Collection<string, SlashCommand<[]>>();

export const ContextMenus = new Collection<string, ContextMenu<keyof TargetTypes>>();
export const InteractionHandlers = new Collection<string, InteractionListener<readonly string[]>>();
export const ReactionHandlers = new Collection<string, ReactionListener>();
export const ReplyHandlers = new Collection<string, ReplyListener>();

export const ApplicationData: ApplicationCommandData[] = [];
