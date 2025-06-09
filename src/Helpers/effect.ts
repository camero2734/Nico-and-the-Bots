import { Effect, Logger, HashMap } from "effect";
import { guild as nicoGuild } from "../../app";
import { channelIDs } from "../../src/Configuration/config";
import topfeedBot from "../../src/Altbots/topfeed/topfeed";
import type { Guild } from "discord.js";

interface LogInfo {
  level: string;
  message: string;
  cause: string;
}

async function sendToDiscordChannel(guild: Guild, log: LogInfo) {
  const channel = await guild.channels.fetch(channelIDs.bottest);
  if (!channel || !channel.isTextBased()) {
    console.error("Channel not found or is not text-based");
    return;
  }

  await channel.send({
    content: `**${log.level}**: ${log.message}\n**Cause**: ${log.cause}`,
  });
}

const discordOnlyLogger = Logger.make((log) => {
  const { annotations, logLevel } = log;
  // if (LogLevel.lessThan(logLevel, LogLevel.Warning)) return;

  const botToLog = HashMap.unsafeGet(annotations, "bot");
  const guild = botToLog === "keons" ? topfeedBot.guild : nicoGuild;
  if (!guild) return;

  const info: LogInfo = {
    level: logLevel.label,
    message: typeof log.message === "string" ? log.message : JSON.stringify(log.message),
    cause: log.cause.toString(),
  };

  sendToDiscordChannel(guild, info).catch(console.error);
});

export const DiscordLogProvider = Effect.provide(
  Logger.replace(Logger.defaultLogger, Logger.zip(Logger.prettyLoggerDefault, discordOnlyLogger)),
);
