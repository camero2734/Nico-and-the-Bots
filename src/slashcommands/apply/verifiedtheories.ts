import { channelIDs, userIDs } from "configuration/config";
import {
    CommandComponentListener,
    CommandError,
    CommandOptions,
    CommandRunner,
    ExtendedContext
} from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import F from "helpers/funcs";
import { Question } from "helpers/verified-quiz/question";
import { ComponentActionRow } from "slash-create";
import QuizQuestions from "../../helpers/verified-quiz/quiz"; // .gitignored
import R from "ramda";

export const Options: CommandOptions = {
    description: "Opens an application for the verified-theories channel",
    options: []
};

// TODO: Use global ComponentListener to avoid having to timeout things
const answerListener = new CommandComponentListener("verifiedquiz", <const>[
    "currentID",
    "questionIDs",
    "answerStatuses",
    "answerIndex"
]);

export const ComponentListeners: CommandComponentListener[] = [answerListener];

const NUM_QUESTIONS = 10;
const $48_HOURS_IN_MS = 1000 * 60 * 60 * 48;
export const Executor: CommandRunner<{ code: string }> = async (ctx) => {
    await ctx.defer(true);

    // Ensure they can't retake the quiz for 48 hours
    const waitTime =
        (await ctx.connection.getRepository(Counter).findOne({ identifier: ctx.member.id, title: "VerifiedQuiz" })) ||
        new Counter({ identifier: ctx.member.id, title: "VerifiedQuiz", lastUpdated: 0 });

    const remainingTime = waitTime.lastUpdated + $48_HOURS_IN_MS - Date.now();
    if (remainingTime > 0 && ctx.member.id !== userIDs.me) {
        const hours = (remainingTime / (1000 * 60 * 60)).toFixed(2);
        throw new CommandError(`You must wait ${hours} hours before applying again.`);
    }

    // Ensure they're ready to take the quiz
    const initialEmbed = new MessageEmbed()
        .setTitle("Verified Theories Quiz")
        .setDescription(
            `This quiz asks various questions related to the lore of the band. There are ${NUM_QUESTIONS} questions and you must answer them *all* correctly.\n\n**If you fail the quiz, you must wait 48 hours before trying again.** If you aren't ready to take the quiz, you can safely dismiss this message. When you're ready, hit Begin below.`
        );

    const actionRow = (<unknown>(
        new MessageActionRow().addComponents([
            new MessageButton({ label: "Begin", style: "SUCCESS", customID: "begin" })
        ])
    )) as ComponentActionRow;
    await ctx.send({ embeds: [initialEmbed.toJSON()], components: [actionRow] });

    const res = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(resolve, 120 * 1000, false); // Avoid a memory leak
        ctx.registerComponent("begin", async () => {
            ctx.unregisterComponent("begin");
            clearTimeout(timeout);
            resolve(true);
        });
    });
    if (!res) return;

    // Update database
    waitTime.lastUpdated = Date.now();
    waitTime.count++;
    await ctx.connection.manager.save(waitTime);

    // Get questions from quiz
    const randomQuestions = F.shuffle(QuizQuestions).slice(0, NUM_QUESTIONS);

    let numWrong = 0;
    for (const question of randomQuestions) {
        const [correct] = await question.ask(ctx);
        if (!correct) numWrong++;
    }

    if (numWrong === 0) {
        const succeedEmbed = new MessageEmbed()
            .setTitle("You passed! 🎉")
            .setDescription(`You now have access to <#${channelIDs.verifiedtheories}>`);

        await ctx.editOriginal({ embeds: [succeedEmbed.toJSON()], components: [] });
    } else {
        const failEmbed = new MessageEmbed()
            .setTitle(`You missed ${numWrong} question${numWrong === 1 ? "" : "s"} 😔`)
            .setDescription("You may try again in 48 hours.");

        await ctx.editOriginal({ embeds: [failEmbed.toJSON()], components: [] });
    }
};

/**
 * We need to jam the state of the quiz into the 100 character customID field
 * It needs to include:
 *  - The questions being asked and their order
 *  - The current question being asked
 *  - The previous answers
 */

/**
 *! Encoding question order
 * This is done simply by storing the permutation in utf16 encoding
 * The maximum permutation is N!, where N is the number of questions
 *
 * So at most: 10 questions = 22 bits = 2 characters, 15 questions = 41 bits = 3 characters
 */

/**
 *! Encoding previous answers
 * Use 4 bits for answer index (so up to 16 answers supported, beyond plenty)
 * Using UTF16 encoding, 4 answers can be stored in a single character
 * So: 10 questions = 3 characters, 15 questions = 4 characters
 */
class PreviousAnswers {
    private answerIndices: Map<Question, number> = new Map();
    constructor(private questions: Question[]) {}

    markAnswer(question: Question, answerIdx: number): boolean;
    markAnswer(question: Question, answer: string | number): boolean {
        if (!this.questions.includes(question)) return false;

        const idx = typeof answer === "number" ? answer : question.answers.indexOf(answer);
        if (idx === -1) return false;

        this.answerIndices.set(question, idx);
        return true;
    }
    fromString(utf16: string): boolean {
        const charTo16Bits = (c: string) => c.charCodeAt(0).toString(2).padStart(16, "0");
        const bits = utf16.split("").map(charTo16Bits);
        const bitStr = bits.join("").slice(0, 4 * NUM_QUESTIONS); // Remove padding at end

        // console.log({ bitStr });
        const answerIdxs = R.splitEvery(4, bitStr).map((bits) => parseInt(bits, 2));

        for (let i = 0; i < this.questions.length; i++) {
            const idx = answerIdxs[i];
            const question = this.questions[i];
            this.markAnswer(question, idx);
        }

        return true;
    }
    toString() {
        let bitStr = "";
        for (const question of this.questions) {
            const idx = this.answerIndices.get(question) ?? 0;
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
}

answerListener.handler = async (interaction, connection, args) => {
    const { currentID, questionIDs, answerStatuses, answerIndex } = args;
};
