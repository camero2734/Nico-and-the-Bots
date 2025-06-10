import { secondsToMilliseconds } from "date-fns";
import { Client, type Guild } from "discord.js";
import { guildID } from "../../Configuration/config";
import secrets from "../../Configuration/secrets";
import type { SiteWatcher } from "./types/websites";
import { queue } from "./worker";

class TopfeedBot {
  client: Client;
  guild: Guild;
  ready: Promise<void>;
  websites: SiteWatcher[] = [];
  constructor() {
    this.client = new Client({
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
    this.client.login(secrets.bots.keons);

    this.ready = new Promise((resolve) => {
      this.client.on("ready", async () => {
        const guild = await this.client.guilds.fetch(guildID);
        this.guild = guild;

        resolve();
      });
    });
  }

  async registerChecks(): Promise<void> {
    await this.ready;

    // Remove all existing jobs bullmq
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
  }
}

// Singleton 😤
const topfeedBot = new TopfeedBot();
export default topfeedBot;
