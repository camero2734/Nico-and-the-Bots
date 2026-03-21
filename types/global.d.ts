import type { Snowflake } from "discord.js";

declare module "discord.js" {
  interface EmbedBuilder {
    toJSON(): Record<string, unknown>;
  }
}
