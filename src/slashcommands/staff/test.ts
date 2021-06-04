import { CommandOptions, CommandRunner } from "configuration/definitions";
import F from "helpers/funcs";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    const str = "221465443297263618";
    const base64 = F.snowflakeToRadix64(str);
    const output = F.radix64toSnowflake(base64);

    ctx.send(`${str} -> ${base64} -> ${output}`);
    // const otherCommand = ctx.getCommand(["apply", "firebreathers"]);
    // ctx.runCommand(warn.Executor, { user: userIDs.me, rule: "Other", severity: 5, explanation: "This is auto" });
};
