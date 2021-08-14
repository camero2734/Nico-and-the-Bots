import { hoursToMilliseconds } from "date-fns";
import { DMChannel, EmbedField, GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { Question } from "../../../Helpers/verified-quiz/question";
import { roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { TimedInteractionListener } from "../../../Helpers/timed-interaction-listener";
import QuizQuestions from "../../../Helpers/verified-quiz/quiz"; // .gitignored

const VERIFIED_DELAY_HOURS = 12;
export const VerifiedQuizConsts = {
    NUM_QUESTIONS: 15,
    DELAY_BETWEEN_TAKING: hoursToMilliseconds(VERIFIED_DELAY_HOURS),
    DELAY_BETWEEN_TAKING_HOURS: VERIFIED_DELAY_HOURS
};
/**
 * We need to jam the state of the quiz into the 100 character customID field
 * It needs to include:
 *  - The questions being asked and their order
 *  - The current question being asked
 *  - The previous answers
 * 8 bits are encoded into a character by using a custom 256 character alphabet
 */

/**
 *! Encoding question order
 * Use 8 bits for question "id". Maximum of a pool of 256 questions
 * One character for every question
 * So: 10 questions = 10 characters, 15 questions = 15 characters
 */

export class QuestionIDEncoder {
    static decode(base256: string): Question[] {
        const bitValues = F.base256Decode(base256);
        const questionIDs = [...bitValues];

        const questions = questionIDs.map((qid) => QuizQuestions.find((q) => q.id === qid));

        return questions.filter((q): q is Question => q !== undefined);
    }
    static encode(chosenQuestions: Question[]) {
        const ids = chosenQuestions.map((q) => q.id);
        const characters = F.base256Encode(Uint8Array.from(ids));
        return characters;
    }
}

/**
 *! Encoding previous answers
 * Use 8 bits for answer index (so up to 256 answers supported, beyond plenty since there can only be 25 buttons max)
 * So: 10 questions = 10 characters, 15 questions = 15 characters
 */
export class PreviousAnswersEncoder {
    public answerIndices: Map<Question, number> = new Map();
    constructor(private questions: Question[]) {}

    markAnswer(question: Question, answer: number | string): boolean {
        if (!this.questions.includes(question)) return false;

        const idx = +answer;
        if (idx === -1) return false;

        this.answerIndices.set(question, idx);
        return true;
    }
    fromString(base256: string): this {
        const bitValues = F.base256Decode(base256);

        const answerIdxs = [...bitValues];

        for (let i = 0; i < this.questions.length; i++) {
            const idx = answerIdxs[i];
            const question = this.questions[i];
            this.markAnswer(question, idx);
        }

        return this;
    }
    toString() {
        const arr = this.questions.map((q) => this.answerIndices.get(q) ?? 0);
        return F.base256Encode(Uint8Array.from(arr));
    }
}

export const createFBApplication = async (dmMessage: Message, member: GuildMember) => {
    const channel = dmMessage.channel as DMChannel;
    const role = await member.guild.roles.fetch(roles.deatheaters);
    const NO_RESPONSE = "*Nothing yet*";

    if (!role) throw new Error("No deatheaters role");

    const answers: Record<string, string> = {};

    return {
        async askQuestion(
            question: string,
            description: string,
            requiresAnswer = true,
            warning?: string
        ): Promise<string> {
            const embed = new MessageEmbed()
                .setTitle(question)
                .setColor(role.color)
                .setDescription(description)
                .addField("\u200b", "\u200b")
                .addField("Your response", NO_RESPONSE)
                .setFooter(
                    "Submit an answer by sending a message with your response. You may edit your response by sending another message. Press 'Continue' to submit your response."
                );

            if (warning) {
                embed.addField("Notice", warning);
            }

            const timedListener = new TimedInteractionListener(dmMessage, <const>["continueFBId"]);
            const [continueId] = timedListener.customIDs;

            const actionRow = new MessageActionRow();
            actionRow.addComponents([new MessageButton({ label: "Continue", customId: continueId, style: "PRIMARY" })]);

            await dmMessage.edit({
                embeds: [embed],
                components: [actionRow]
            });

            // Listen for user messages
            const field = embed.fields.find((f) => f.name === "Your response") as EmbedField;
            const listener = channel.createMessageCollector({
                filter: (m) => m.author.id === member.id,
                time: undefined
            });
            let answer = field.value;
            listener.on("collect", async (m: Message) => {
                answer = m.content;
                field.value = "```\n" + m.content + "```";

                await dmMessage.edit({
                    embeds: [embed.toJSON()],
                    components: [actionRow]
                });
                await m.delete();
            });

            const buttonPressed = await timedListener.wait();
            console.log(buttonPressed, /BUTTON_PRESSED/);
            listener.stop();

            if (buttonPressed !== continueId) {
                throw new CommandError("Your application was cancelled. You may restart if you wish.");
            }

            // Just reask the question since they didn't answer a required question
            if (requiresAnswer && field.value === NO_RESPONSE) {
                return this.askQuestion(
                    question,
                    description,
                    requiresAnswer,
                    "You must provide an answer for this question."
                );
            }

            answers[question] = answer;
            return answer;
        },
        getAnswers(): Record<string, string> {
            return answers;
        }
    };
};
