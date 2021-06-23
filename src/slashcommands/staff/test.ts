import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import F from "helpers/funcs";
import fetch from "node-fetch";
import R from "ramda";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

const NUM_QUESTIONS = 15;

function convFromString(utf16: string): boolean {
    const charTo16Bits = (c: string) => c.charCodeAt(0).toString(2).padStart(16, "0");
    const bits = utf16.split("").map(charTo16Bits);
    const bitStr = bits.join("").slice(0, 4 * NUM_QUESTIONS); // Remove padding at end

    console.log({ bitStr });
    const answerIdxs = R.splitEvery(4, bitStr).map((bits) => parseInt(bits, 2));

    for (let i = 0; i < answerIdxs.length; i++) {
        const idx = answerIdxs[i];
        console.log(idx);
        // const question = this.questions[i];
        // this.markAnswer(question, idx);
    }

    return true;
}
function convToString() {
    let bitStr = "";
    const questions = F.indexArray(NUM_QUESTIONS);
    let i = 0;
    for (const question of questions) {
        const idx = i++;
        const bits = idx.toString(2).padStart(4, "0");
        bitStr += bits;
    }

    const padLength = 16 * Math.ceil(bitStr.length / 16);
    const padded = bitStr.padEnd(padLength, "0");

    const characters = R.splitEvery(16, padded)
        .map((bits) => String.fromCharCode(parseInt(bits, 2)))
        .join("");
    console.log({ bitStr, padded });
    return characters;
}

export const Executor: CommandRunner = async (ctx) => {
    //
    // await ctx.send(`(${r})\n`);
    // ctx.send({ embeds: [embed.toJSON()] });
};
