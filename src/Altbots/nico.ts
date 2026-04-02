import { Client, Events, Guild, Partials } from "discord.js";
import { guildID } from "../Configuration/config";

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

const readyPromise = Promise.withResolvers<Guild>();

client.on(Events.ClientReady, async () => {
  const guild = await client.guilds.fetch({ force: true, guild: guildID });
  readyPromise.resolve(guild);
});

export const guild = await readyPromise.promise;
