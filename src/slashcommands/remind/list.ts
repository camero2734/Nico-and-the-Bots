import { CommandRunner, createOptions } from "configuration/definitions";

export const Options = createOptions(<const>{
    description: "Presents a list of your reminders",
    options: []
});

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer();
};
1;
