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

await client.login(secrets.bots.keons);
await new Promise((resolve) => client.once(Events.ClientReady, resolve));

export const keonsGuild = await client.guilds.fetch(guildID);
