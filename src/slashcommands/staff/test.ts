import { PrismaClient } from "@prisma/client";
import { CommandError, CommandOptions, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { CommandOptionType } from "slash-create";
import { Economy } from "../../database/entities/Economy";
import { queries } from "../../helpers/prisma-init";

export const Options = createOptions(<const>{
    description: "Test command",
    options: [
        {
            name: "user",
            description: "User",
            required: true,
            type: CommandOptionType.USER
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    const start = Date.now();
    const results = await queries.monthlyStats();
    const time = Date.now() - start;

    const user = results.find((r) => r.userId === ctx.opts.user);

    if (!user) throw new CommandError("Error");
    await ctx.send(`You are #${user.place} monthly, with a score of ${user.score} [${time}ms]`);
};
