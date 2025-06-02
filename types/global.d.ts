import type { Snowflake } from "discord.js";

declare global {
	interface String {
		toSnowflake(): Snowflake;
	}
}

declare module "discord.js" {
	interface EmbedBuilder {
		toJSON(): Record<string, unknown>;
	}
}
