import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { CommandOptionType } from "slash-create";

export const Options = createOptions({
    description: "Mutes a user",
    options: <const>[
        { name: "user", description: "The user to mute", required: true, type: CommandOptionType.USER },
        {
            name: "reason",
            description: "Reason for muting",
            required: true,
            type: CommandOptionType.INTEGER,
            choices: [
                { name: "Number", value: 5 },
                { name: "Something", value: 4 }
            ]
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    const { user, reason } = ctx.opts;
    //
};
