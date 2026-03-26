import { ComponentType, type GuildMember, type Interaction } from "discord.js";

type InteractionTypeString =
  | "chat_input"
  | "button"
  | "select_menu"
  | "modal"
  | "context_menu"
  | "autocomplete"
  | "unknown";

export interface WideEvent {
  timestamp: string;
  duration_ms: number;
  event_id: string;
  discord?: {
    guild_id: string;
    channel_id: string | null;
    user_id: string;
    user_tag: string;
    member_display_name: string;
    interaction_id: string;
    interaction_type: InteractionTypeString;
    command_name?: string;
    subcommand_group?: string;
    subcommand?: string;
    command_string?: string;
    custom_id?: string;
    component_type?: string;
    deferred: boolean;
    replied: boolean;
  };
  bot: {
    entrypoint?: string;
    identifier?: string;
    job_name?: string;
  };
  outcome: "success" | "error";
  error?: {
    type: string;
    message: string;
    stack: string;
    error_id: string;
  };
  extended: Record<string, unknown>;
}

function getInteractionType(interaction: Interaction): InteractionTypeString {
  if (interaction.isChatInputCommand()) return "chat_input";
  if (interaction.isButton()) return "button";
  if (interaction.isStringSelectMenu()) return "select_menu";
  if (interaction.isModalSubmit()) return "modal";
  if (interaction.isContextMenuCommand()) return "context_menu";
  if (interaction.isAutocomplete()) return "autocomplete";
  return "unknown";
}

function getComponentTypeName(componentType: ComponentType | undefined): string | undefined {
  if (componentType === undefined) return undefined;

  return ComponentType[componentType];
}

export function createWideEvent(interaction: Interaction) {
  const eventId = Bun.randomUUIDv7();
  const member = interaction.member as GuildMember | null;

  const wideEvent: WideEvent & { discord: NonNullable<WideEvent["discord"]> } = {
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    event_id: eventId,
    discord: {
      guild_id: interaction.guildId ?? "",
      channel_id: interaction.channelId,
      user_id: interaction.user.id,
      user_tag: interaction.user.tag,
      member_display_name: member?.displayName ?? interaction.user.username,
      interaction_id: interaction.id,
      interaction_type: getInteractionType(interaction),
      deferred: "deferred" in interaction ? interaction.deferred : false,
      replied: "replied" in interaction ? interaction.replied : false,
    },
    bot: {},
    outcome: "success",
    extended: {},
  };

  if (interaction.isChatInputCommand()) {
    wideEvent.discord.command_name = interaction.commandName;
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(false);
    if (subcommandGroup) wideEvent.discord.subcommand_group = subcommandGroup;
    if (subcommand) wideEvent.discord.subcommand = subcommand;
    wideEvent.discord.command_string = interaction.toString();
  }

  if (interaction.isMessageComponent()) {
    wideEvent.discord.custom_id = interaction.customId;
    wideEvent.discord.component_type = getComponentTypeName(interaction.componentType);
  }

  if (interaction.isModalSubmit()) {
    wideEvent.discord.custom_id = interaction.customId;
  }

  if (interaction.isContextMenuCommand()) {
    wideEvent.discord.command_name = interaction.commandName;
  }

  return wideEvent;
}

export function createBackgroundEvent(jobName: string): WideEvent {
  const eventId = Bun.randomUUIDv7();

  return {
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    event_id: eventId,
    bot: {
      job_name: jobName,
    },
    outcome: "success",
    extended: {},
  };
}

export function setBotContext(wideEvent: WideEvent, entrypoint: string, identifier: string): WideEvent {
  wideEvent.bot.entrypoint = entrypoint;
  wideEvent.bot.identifier = identifier;
  return wideEvent;
}

export function buildErrorInfo(error: unknown, eventId: string): WideEvent["error"] {
  const isError = error instanceof Error;

  return {
    type: isError ? error.constructor.name : typeof error,
    message: isError ? error.message : String(error),
    stack: isError ? (error.stack ?? "") : "",
    error_id: eventId,
  };
}

export function finalizeWideEvent(wideEvent: WideEvent, outcome: "success" | "error", error?: unknown): WideEvent {
  const startTime = new Date(wideEvent.timestamp).getTime();
  wideEvent.duration_ms = Date.now() - startTime;
  wideEvent.outcome = outcome;

  if (outcome === "error" && error) {
    wideEvent.error = buildErrorInfo(error, wideEvent.event_id);
  }

  return wideEvent;
}

export function emitWideEvent(wideEvent: WideEvent): void {
  console.info(JSON.stringify(wideEvent));
}

export function addElement(extended: Record<string, unknown>, key: string, element: unknown): void {
  if (!extended[key]) {
    extended[key] = [];
  }

  if (Array.isArray(extended[key])) {
    extended[key].push(element);
  }
}