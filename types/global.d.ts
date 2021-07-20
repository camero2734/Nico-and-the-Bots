import { Snowflake } from "discord.js";

declare global {
    interface String {
        toSnowflake(): Snowflake;
    }
}

declare module "discord.js" {
    interface MessageEmbed {
        toJSON(): Record<string, unknown>;
    }
}
