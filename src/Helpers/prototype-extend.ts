import { Snowflake } from "discord.js";

export const extendPrototypes = () => {
    String.prototype.toSnowflake = function (): Snowflake {
        return this.toString() as Snowflake;
    };
};
