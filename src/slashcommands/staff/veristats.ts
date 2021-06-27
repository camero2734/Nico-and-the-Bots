import { CommandOptions, CommandRunner } from "configuration/definitions";
import { Poll } from "database/entities/Poll";
import { MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import F from "helpers/funcs";
import fetch from "node-fetch";
import R from "ramda";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Shows stats about verified questions",
    options: [
        {
            name: "stat",
            description: "The stat to display",
            required: false,
            type: CommandOptionType.STRING,
            choices: [
                { name: "Hardest Questions", value: "hardest" },
                { name: "Easiest Questions", value: "easiest" }
            ]
        }
    ]
};

export const Executor: CommandRunner<{ stat: "hardest" | "easiest" }> = async (ctx) => {
    const stats = await ctx.connection.getMongoRepository(Poll).find({ where: { identifier: { $regex: /^VFQZ/ } } });
    console.log(stats);
};
