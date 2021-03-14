import { CommandOptionType } from "slash-create";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed } from "discord.js";

export const Options: CommandOptions = {
    description: "the score",
    options: [{ name: "test", description: "This is a test option", required: false, type: CommandOptionType.BOOLEAN }]
};

export const Executor: CommandRunner = async (ctx) => {
    await ctx.embed(new MessageEmbed({description: "Nuh"}));
};