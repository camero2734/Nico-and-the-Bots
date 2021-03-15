import { CommandOptionType } from "slash-create";
import { CommandOptions, CommandRunner } from "configuration/definitions";

export const Options: CommandOptions = {
    description: "Default",
    options: [{ name: "test", description: "This is a test option", required: false, type: CommandOptionType.BOOLEAN }]
};

export const Executor: CommandRunner = async (ctx) => {
    await ctx.send(`Nah`);
};
