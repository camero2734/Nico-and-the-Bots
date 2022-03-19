import { Snowflake } from "discord.js";

declare global {
    interface String {
        toSnowflake(): Snowflake;
    }
}

declare module "discord.js" {
    interface Embed {
        toJSON(): Record<string, unknown>;
    }
}
