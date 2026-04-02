import { Client, Events } from "discord.js";
import { guildID } from "../../Configuration/config";
import secrets from "../../Configuration/secrets";

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

// Temporary fix for fetchShardCount being called in discord.js
if (!(client.ws as any).fetchShardCount && typeof client.ws.getShardCount === "function") {
  (client.ws as any).fetchShardCount = client.ws.getShardCount.bind(client.ws);
}

console.log("[topfeed] logging in");
await client.login(secrets.bots.keons);
console.log("[topfeed] login attempted");
await new Promise((resolve) => client.once(Events.ClientReady, resolve));
console.log("[topfeed] client ready");
export const keonsGuild = await client.guilds.fetch(guildID);
