import { Client, Partials } from "discord.js";

export const client = new Client({
  intents: [
    "Guilds",
    "DirectMessages",
    "DirectMessageReactions",
    "GuildMessageReactions",
    "GuildBans",
    "GuildEmojisAndStickers",
    "GuildMembers",
    "GuildMessages",
    "GuildIntegrations",
    "GuildInvites",
    "GuildVoiceStates",
    "GuildWebhooks",
  ],
  partials: [Partials.Reaction, Partials.User, Partials.Message, Partials.Channel],
});
