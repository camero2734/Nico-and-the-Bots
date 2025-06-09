import { Effect, Logger, LogLevel, HashMap, Option } from "effect";
import { guild as nicoGuild } from "../../app";
import { channelIDs } from "../../src/Configuration/config";
import topfeedBot from "../../src/Altbots/topfeed/topfeed";
import type { Guild } from "discord.js";

interface LogInfo {
  level: string;
  isSevere: boolean;
  message: string[];
  annotations: Record<string, unknown>;
  cause: string;
}

async function sendToDiscordChannel(guild: Guild, log: LogInfo) {
  const channel = await guild.channels.fetch(channelIDs.bottest);
  if (!channel || !channel.isTextBased()) {
    console.error("Channel not found or is not text-based");
    return;
  }

  await channel.send({
    content: `**${log.level}**: ${log.message}\n**Cause**: ${log.cause}\n**Annotations**: ${JSON.stringify(log.annotations, null, 2)}`,
  });
}

const discordOnlyLogger = Logger.make((log) => {
  const { annotations, logLevel } = log;

  const botToLog = Option.getOrUndefined(HashMap.get(annotations, "bot"));
  const guild = botToLog === "keons" ? topfeedBot.guild : nicoGuild;
  if (!guild) return;

  const jsonAnnotations = log.annotations.toJSON() as Record<string, unknown>;

  const info: LogInfo = {
    level: logLevel.label,
    isSevere: LogLevel.greaterThan(logLevel, LogLevel.Warning),
    message: Array.isArray(log.message) ? log.message.map((x) => JSON.stringify(x)) : [JSON.stringify(log.message)],
    cause: log.cause.toString(),
    annotations: jsonAnnotations,
  };

  sendToDiscordChannel(guild, info).catch(console.error);
});

export const DiscordLogProvider = Effect.provide(
  Logger.replace(Logger.defaultLogger, Logger.zip(Logger.prettyLoggerDefault, discordOnlyLogger)),
);
