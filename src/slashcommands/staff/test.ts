import { CommandRunner, createOptions, extendContext, OptsType } from "configuration/definitions";
import {
    CommandContext,
    CommandMember,
    CommandOptionType,
    InteractionRequestData,
    InteractionType
} from "slash-create";
import { interactions } from "../../../app";
import * as jail from "./jail";

export const Options = createOptions(<const>{
    description: "Test command",
    options: [
        {
            name: "user",
            description: "User",
            required: false,
            type: CommandOptionType.USER
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    // const start = Date.now();
    // const results = await queries.monthlyStats();
    // const time = Date.now() - start;

    // const user = results.find((r) => r.userId === ctx.opts.user);

    // if (!user) throw new CommandError("Error");
    // await ctx.send(`You are #${user.place} monthly, with a score of ${user.score} [${time}ms]`);

    const data: InteractionRequestData = {
        channel_id: ctx.channelID as string,
        data: { id: "f", name: "fff" },
        guild_id: ctx.guildID as string,
        id: "f",
        member: ctx.member as unknown as CommandMember,
        token: "f",
        version: 1,
        type: InteractionType.COMMAND
    };
    const newctx = new CommandContext(
        interactions,
        data,
        async () => {
            /** */
        },
        false
    );

    console.log(newctx.send, /send/);

    const ectx = await extendContext(newctx, ctx.client, null as any);
    // Hooks into !jail to jail user
    ectx.runCommand(jail.Executor, {
        user: "335912315494989825",
        explanation: "[Autojail] You were automatically jailed for receiving multiple warnings."
    });
};
