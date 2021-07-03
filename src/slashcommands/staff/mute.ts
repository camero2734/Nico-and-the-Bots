import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { CommandOptionType } from "slash-create";

export const Options = createOptions({
    description: "Mutes a user",
    options: [
        { name: "user", description: "The user to mute", required: true, type: CommandOptionType.INTEGER },
        {
            name: "reason",
            description: "Reason for muting",
            required: true,
            type: CommandOptionType.STRING,
            choices: [
                { name: "Test", value: "hello" },
                { name: "Something", value: "No" }
            ]
        }
    ]
} as const);

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    const { user, reason } = ctx.opts;
    //
};
