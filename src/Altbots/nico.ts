import { Client, Events, Guild, Partials } from "discord.js";
import { guildID } from "../Configuration/config";

export let guild: Guild;

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
    "GuildPresences",
    "GuildVoiceStates",
    "GuildWebhooks",
  ],
  partials: [Partials.Reaction, Partials.User, Partials.Message, Partials.Channel],
});

client.on(Events.ClientReady, async () => {
  guild = await client.guilds.fetch({ force: true, guild: guildID });
});