import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ComponentType, type GuildMember, type Interaction } from "discord.js";
import type { RequestLogger } from "evlog";
import { createRequestLogger, initLogger, log } from "evlog";
import { prisma } from "../prisma-init";

export type BotLogger = RequestLogger;
export { log };

type InteractionTypeString =
  | "chat_input"
  | "button"
  | "select_menu"
  | "modal"
  | "context_menu"
  | "autocomplete"
  | "unknown";

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

initLogger({
  env: { service: "nico-bot" },
  pretty: process.env.NODE_ENV !== "production",
  drain: async (ctx: { event: Record<string, unknown> }) => {
    const event = ctx.event;
    const bot = event.bot as Record<string, unknown> | undefined;
    if (!bot?.entrypoint) return;

    const discord = event.discord as Record<string, string | boolean | null | undefined> | undefined;
    if (!discord) return;

    try {
      await prisma.commandUsed.create({
        data: {
          id: event.requestId as string,
          channelId: (discord.channel_id as string | null) ?? null,
          identifier: (bot.identifier as string) ?? "Unknown",
          type: discord.interaction_type as string,
          userId: discord.user_id as string,
          createdAt: discord.created_at ? new Date(discord.created_at as string) : new Date(),
          state: event.outcome === "success" ? "Finished" : "Errored",
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        // Duplicate, ignore
      } else {
        log.error({ message: "Prisma drain error", error: (e as Error).message, step: "prisma-drain" });
      }
    }
  },
});

export function createInteractionLogger(interaction: Interaction): BotLogger {
  const member = interaction.member as GuildMember | null;

  const requestLogger = createRequestLogger({
    requestId: interaction.id,
  });
  requestLogger.set({ timestamp: new Date().toISOString() });

  const discordContext: Record<string, unknown> = {
    guild_id: interaction.guildId ?? "",
    channel_id: interaction.channelId,
    user_id: interaction.user.id,
    user_tag: interaction.user.tag,
    member_display_name: member?.displayName ?? interaction.user.username,
    interaction_id: interaction.id,
    interaction_type: getInteractionType(interaction),
    deferred: "deferred" in interaction ? interaction.deferred : false,
    replied: "replied" in interaction ? interaction.replied : false,
    created_at: interaction.createdAt.toISOString(),
  };

  if (interaction.isChatInputCommand()) {
    discordContext.command_name = interaction.commandName;
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(false);
    if (subcommandGroup) discordContext.subcommand_group = subcommandGroup;
    if (subcommand) discordContext.subcommand = subcommand;
    discordContext.command_string = interaction.toString();
  }

  if (interaction.isMessageComponent()) {
    discordContext.custom_id = interaction.customId;
    discordContext.component_type = getComponentTypeName(interaction.componentType);
  }

  if (interaction.isModalSubmit()) {
    discordContext.custom_id = interaction.customId;
  }

  if (interaction.isContextMenuCommand()) {
    discordContext.command_name = interaction.commandName;
  }

  requestLogger.set({ discord: discordContext });

  return requestLogger;
}

export function createJobLogger(jobName: string): BotLogger {
  const requestLogger = createRequestLogger({
    requestId: Bun.randomUUIDv7(),
  });
  requestLogger.set({ timestamp: new Date().toISOString(), bot: { job_name: jobName } });
  return requestLogger;
}