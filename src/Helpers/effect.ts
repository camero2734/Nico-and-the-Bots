import { Effect, Logger, LogLevel, HashMap, Option } from "effect";
import { guild as nicoGuild } from "../../app";
import { channelIDs, userIDs } from "../../src/Configuration/config";
import topfeedBot from "../../src/Altbots/topfeed/topfeed";
import {
  type Guild,
  type APIComponentInContainer,
  ComponentType,
  userMention,
  ContainerBuilder,
  MessageFlags,
} from "discord.js";
import F from "../../src/Helpers/funcs";

interface LogInfo {
  level: string;
  isSevere: boolean;
  message: string[];
  annotations: [string, unknown][];
  cause: string;
}

async function sendToDiscordChannel(guild: Guild, log: LogInfo) {
  const channel = await guild.channels.fetch(channelIDs.bottest);
  if (!channel || !channel.isTextBased()) {
    console.error("Channel not found or is not text-based");
    return;
  }

  const { level, isSevere, message, annotations, cause } = log;

  // Determine accent color based on severity
  const accentColor = isSevere ? 0xed4245 : 0x5865f2; // Red for severe, Blurple otherwise

  // --- Component Sections ---

  // Optional mention section for severe logs
  const mentionSection: APIComponentInContainer[] = isSevere
    ? [
        {
          type: ComponentType.TextDisplay,
          content: `-# ${userMention(userIDs.me)}`,
        },
        { type: ComponentType.Separator, divider: false, spacing: 1 },
      ]
    : [];

  // Main log information
  const mainSection: APIComponentInContainer[] = [
    {
      type: ComponentType.TextDisplay,
      content: `**Level:** ${level.toUpperCase()}`,
    },
    {
      type: ComponentType.TextDisplay,
      content: `**Message:** ${message.join("\n")}`,
    },
  ];

  // Section for the cause, if provided
  const causeSection: APIComponentInContainer[] = cause
    ? [
        { type: ComponentType.Separator, divider: true, spacing: 1 },
        {
          type: ComponentType.TextDisplay,
          content: `**Cause:** ${cause}`,
        },
      ]
    : [];

  // Section for annotations, if provided
  const annotationsSection: APIComponentInContainer[] =
    annotations.length > 0
      ? [
          { type: ComponentType.Separator, divider: true, spacing: 1 },
          {
            type: ComponentType.TextDisplay,
            content: `**Annotations:** ${annotations
              .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
              .join(" ")}`,
          },
        ]
      : [];

  // Footer with a timestamp
  const footerSection: APIComponentInContainer[] = [
    { type: ComponentType.Separator, divider: false, spacing: 2 },
    {
      type: ComponentType.TextDisplay,
      content: `Logged ${F.discordTimestamp(new Date(), "relative")}`,
    },
  ];

  // Build the final container
  const logContainer = new ContainerBuilder({
    components: [...mentionSection, ...mainSection, ...causeSection, ...annotationsSection, ...footerSection],
    accent_color: accentColor,
  });

  await channel.send({
    components: [logContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}

const discordOnlyLogger = Logger.make((log) => {
  const { annotations, logLevel } = log;

  const botToLog = Option.getOrUndefined(HashMap.get(annotations, "bot"));
  const guild = botToLog === "keons" ? topfeedBot.guild : nicoGuild;
  if (!guild) return;

  const info: LogInfo = {
    level: logLevel.label,
    isSevere: LogLevel.greaterThan(logLevel, LogLevel.Warning),
    message: Array.isArray(log.message) ? log.message.map((x) => JSON.stringify(x)) : [JSON.stringify(log.message)],
    cause: log.cause.toString(),
    annotations: HashMap.toEntries(annotations),
  };

  sendToDiscordChannel(guild, info).catch(console.error);
});

export const DiscordLogProvider = Effect.provide(
  Logger.replace(Logger.defaultLogger, Logger.zip(Logger.prettyLoggerDefault, discordOnlyLogger)),
);
