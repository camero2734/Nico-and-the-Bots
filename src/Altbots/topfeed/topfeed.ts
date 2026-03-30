import { Client, Events } from "discord.js";
import { guildID } from "../../Configuration/config";
import secrets from "../../Configuration/secrets";
import { queue } from "../../Helpers/jobs";

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

for (const jobName of ["TWITTER", "INSTAGRAM", "YOUTUBE", "WEBSITES"] as const) {
  queue.topfeed.add({ type: jobName }, { repeat: { every: 1000 * 60 * 5 }, deduplication: { id: jobName } });
}

export const keonsGuild = await client.guilds.fetch(guildID);
