import { channelIDs, roles, userIDs } from "configuration/config";
import { CommandComponentListener, CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Poll } from "database/entities/Poll";
import { hoursToMilliseconds, millisecondsToHours } from "date-fns";
import { GuildMember, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import F from "helpers/funcs";
import { Question } from "helpers/verified-quiz/question";
import R from "ramda";
import { ComponentActionRow } from "slash-create";
import { Connection } from "typeorm";
import QuizQuestions from "../../helpers/verified-quiz/quiz"; // .gitignored

export const Options: CommandOptions = {
    description: "Opens an application for the verified-theories channel",
    options: []
};

// TODO: Use global ComponentListener to avoid having to timeout things
const answerListener = new CommandComponentListener("verifiedquiz", <const>[
    "currentID",
    "questionIDs",
    "previousAnswers",
    "chosenAnswer",
    "numQs"
]);
answerListener.pattern.delimiter = "𝄎"; // Ensure no conflicts with UTF8 range used

export const ComponentListeners: CommandComponentListener[] = [answerListener];

const NUM_QUESTIONS = 15;

const DELAY_HOURS = 12;
const DELAY_BETWEEN_TAKING = hoursToMilliseconds(DELAY_HOURS);
export const Executor: CommandRunner<{ code: string }> = async (ctx) => {
    await ctx.defer(true);

    // If they already have the VQ role then no need to take again
    if (ctx.member.roles.cache.has(roles.verifiedtheories)) {
        throw new CommandError("You already passed the quiz!");
    }

    // Ensure they can't retake the quiz for 48 hours
    const waitTime =
        (await ctx.connection.getRepository(Counter).findOne({ identifier: ctx.member.id, title: "VerifiedQuiz" })) ||
        new Counter({ identifier: ctx.member.id, title: "VerifiedQuiz", lastUpdated: 0 });

    const remainingTime = waitTime.lastUpdated + DELAY_BETWEEN_TAKING - Date.now();
    if (remainingTime > 0 && !ctx.member.roles.cache.has(roles.staff)) {
        const hours = (remainingTime / (1000 * 60 * 60)).toFixed(2);
        throw new CommandError(`You must wait ${hours} hours before applying again.`);
    }

    // Ensure they're ready to take the quiz
    const initialEmbed = new MessageEmbed()
        .setTitle("Verified Theories Quiz")
        .setDescription(
            `This quiz asks various questions related to the lore of the band. There are ${NUM_QUESTIONS} questions and you must answer them *all* correctly.\n\n**If you fail the quiz, you must wait ${DELAY_HOURS} hours before trying again.** If you aren't ready to take the quiz, you can safely dismiss this message. When you're ready, hit Begin below.\n\n*Note:* Select your answers very carefully - **once you select an answer, it is final.**`
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

    // Generate initial variables
    const questionList = F.shuffle(QuizQuestions).slice(0, NUM_QUESTIONS);
    const answerEncoder = new PreviousAnswersEncoder(questionList);
    const questionIDs = QuestionIDEncoder.encode(questionList);
    const [quizEmbed, quizComponents] = await generateEmbedAndButtons(-1, questionList, answerEncoder, questionIDs, ctx.connection, ctx.member); // prettier-ignore

    await ctx.editOriginal({
        embeds: [quizEmbed.toJSON()],
        components: quizComponents as unknown as ComponentActionRow[]
    });
};

/**
 * We need to jam the state of the quiz into the 100 character customID field
 * It needs to include:
 *  - The questions being asked and their order
 *  - The current question being asked
 *  - The previous answers
 * 16 bits are encoded into a character by using the UTF8 code points 0000 -> FFFF
 */

/**
 *! Encoding question order
 * Use 8 bits for question "id". Maximum of 256 questions (way more than needed)
 * One character for every two questions
 * So: 10 questions = 5 characters, 15 questions = 8 characters
 */

class QuestionIDEncoder {
    static decode(utf16: string, numQs: number): Question[] {
        const bitStr = F.UTF8ToBitStr(utf16, 8 * numQs);
        const questionIDs = R.splitEvery(8, bitStr);

        const questions = questionIDs.map((qid) => QuizQuestions.find((q) => q.binaryID(8) === qid));

        return questions.filter((q): q is Question => q !== undefined);
    }
    static encode(chosenQuestions: Question[]) {
        const ids = chosenQuestions.map((q) => q.binaryID(8));
        const bitStr = ids.join("");
        const characters = F.bitStringToUTF8(bitStr);
        return characters;
    }
}

/**
 *! Encoding previous answers
 * Use 4 bits for answer index (so up to 16 answers supported, beyond plenty)
 * So: 10 questions = 3 characters, 15 questions = 4 characters
 *
 * This class is reused for encoding the current question into a single character
 */
class PreviousAnswersEncoder {
    public answerIndices: Map<Question, number> = new Map();
    constructor(private questions: Question[]) {}

    markAnswer(question: Question, answer: number | string): boolean {
        if (!this.questions.includes(question)) return false;

        const idx = +answer;
        if (idx === -1) return false;

        this.answerIndices.set(question, idx);
        return true;
    }
    fromString(utf16: string, numQs: number): this {
        const bitStr = F.UTF8ToBitStr(utf16, 4 * numQs);

        const answerIdxs = R.splitEvery(4, bitStr).map((bits) => parseInt(bits, 2));

        for (let i = 0; i < this.questions.length; i++) {
            const idx = answerIdxs[i];
            const question = this.questions[i];
            this.markAnswer(question, idx);
        }

        return this;
    }
    toString() {
        let bitStr = "";
        for (const question of this.questions) {
            const idx = this.answerIndices.get(question) ?? 0;
            const bits = idx.toString(2).padStart(4, "0");
            bitStr += bits;
        }

        const characters = F.bitStringToUTF8(bitStr);
        return characters;
    }
}

answerListener.handler = async (interaction, connection, args) => {
    const { currentID, questionIDs, previousAnswers, chosenAnswer, numQs } = args;

    const member = interaction.member as GuildMember;

    const questionList = QuestionIDEncoder.decode(questionIDs, +numQs);

    // Update answer list
    const currentIndex = questionList.findIndex((q) => q.hexID === currentID);
    const answerEncode = new PreviousAnswersEncoder(questionList).fromString(previousAnswers, +numQs);
    answerEncode.markAnswer(questionList[currentIndex], chosenAnswer);

    const [embed, components] = await generateEmbedAndButtons(
        currentIndex,
        questionList,
        answerEncode,
        questionIDs,
        connection,
        member
    );

    interaction.deferred = true; // The original int. was deferred, discord.js throws an error when editing if not manually overriden
    await interaction.editReply({ embeds: [embed], components });
};

async function generateEmbedAndButtons(
    currentIndex: number,
    questionList: Question[],
    answerEncode: PreviousAnswersEncoder,
    questionIDs: string,
    connection: Connection,
    member: GuildMember
): Promise<[MessageEmbed, MessageActionRow[]]> {
    // Generate embed
    const newIndex = currentIndex + 1;
    const numQs = questionList.length;

    if (newIndex === numQs) return sendFinalEmbed(questionList, answerEncode, connection, member);

    const newQuestion = questionList[newIndex];
    const embed = new MessageEmbed()
        .setAuthor(`Question ${newIndex + 1} / ${numQs}`)
        .setTitle("Verified Theories Quiz")
        .setDescription(newQuestion.question)
        .setFooter("Select the correct answer by hitting a button below");

    // Update variables and encode into buttons' customIDs
    const components = F.shuffle(
        newQuestion.answers.map((answer, idx) => {
            return new MessageButton({
                label: answer,
                style: "PRIMARY",
                customID: answerListener.generateCustomID({
                    currentID: newQuestion.hexID,
                    questionIDs,
                    previousAnswers: answerEncode.toString(),
                    chosenAnswer: idx.toString(),
                    numQs: `${numQs}`
                })
            });
        })
    );

    const actionRows = R.splitEvery(5, components).map((cs) => new MessageActionRow().addComponents(cs));

    return [embed, actionRows];
}

async function sendFinalEmbed(
    questionList: Question[],
    answerEncode: PreviousAnswersEncoder,
    connection: Connection,
    member: GuildMember
): Promise<[MessageEmbed, MessageActionRow[]]> {
    const answers = answerEncode.answerIndices;

    // Send to staff channel
    const staffEmbed = new MessageEmbed().setAuthor(member.displayName, member.user.displayAvatarURL());

    let incorrect = 0;
    for (const q of questionList) {
        const answerGiven = answers.get(q) ?? -1;
        if (answerGiven !== q.correct) incorrect++;

        const givenAnswerText = q.answers[answerGiven] || "None";
        const correctAnswerText = q.answers[q.correct];
        staffEmbed.addField(q.question.split("\n")[0], `🙋 ${givenAnswerText}\n📘 ${correctAnswerText}`);

        // Record question answer
        const poll =
            (await connection.getRepository(Poll).findOne({ identifier: `VFQZ${q.hexID}` })) ||
            new Poll({ identifier: `VFQZ${q.hexID}`, userid: "" });
        poll.votes.push({ userid: member.id, index: answerGiven });
        await connection.manager.save(poll);
    }
    const correct = questionList.length - incorrect;
    const passed = incorrect === 0;
    const hours = millisecondsToHours(DELAY_BETWEEN_TAKING);

    staffEmbed
        .setTitle(`${passed ? "Passed" : "Failed"}: ${correct}/${questionList.length} correct`)
        .setColor(passed ? "#88FF88" : "#FF8888");
    const staffChan = member.guild.channels.cache.get(channelIDs.verifiedapplications) as TextChannel;
    await staffChan.send({ embeds: [staffEmbed] });

    if (passed) {
        await member.roles.add(roles.verifiedtheories);
    }

    // Send embed to normal user
    const embed = new MessageEmbed()
        .setTitle(`${correct}/${questionList.length} correct`)
        .setColor(passed ? "#88FF88" : "#FF8888")
        .setDescription(
            `You ${passed ? "passed" : "failed"} the verified theories quiz${passed ? "!" : "."}\n\n${
                passed
                    ? `You can now access <#${channelIDs.verifiedtheories}>`
                    : `You may apply again in ${hours} hours.`
            }`
        );

    return [embed, []];
}
