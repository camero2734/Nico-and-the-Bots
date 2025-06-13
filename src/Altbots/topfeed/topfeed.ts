import { secondsToMilliseconds } from "date-fns";
import { Client } from "discord.js";
import { guildID } from "../../Configuration/config";
import secrets from "../../Configuration/secrets";
import { queue } from "./worker";

const client = new Client({
  intents: [
    "Guilds",
    "DirectMessages",
    "DirectMessageReactions",
    "GuildBans",
    "GuildEmojisAndStickers",
    "GuildMembers",
    "GuildMessages",
    "GuildIntegrations",
    "GuildInvites",
    "GuildPresences",
    "GuildVoiceStates",
    "GuildWebhooks",
  ],
});

await client.login(secrets.bots.keons);
await new Promise((resolve) => client.once("ready", resolve));

export const keonsGuild = await client.guilds.fetch(guildID);

// Reset the queue
await queue.obliterate({ force: true });

await queue.add("WEBSITES", "", {
  repeat: { every: secondsToMilliseconds(6) },
  deduplication: {
    id: "WEBSITES",
  },
});
await queue.add("TWITTER", "", {
  repeat: { every: secondsToMilliseconds(2) },
  deduplication: {
    id: "TWITTER",
  },
});
await queue.add("INSTAGRAM", "", {
  repeat: { every: secondsToMilliseconds(30) },
  deduplication: {
    id: "INSTAGRAM",
  },
});
await queue.add("YOUTUBE", "", {
  repeat: { every: secondsToMilliseconds(10) },
  deduplication: {
    id: "YOUTUBE",
  },
});
