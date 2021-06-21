import { channelIDs, userIDs } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import F from "helpers/funcs";
import { ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Opens an application for the verified-theories channel",
    options: []
};

// TODO: Use global ComponentListener to avoid having to timeout things

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

    // Quiz begins
    const questions: Question[] = [new Question("What?", <const>["Yes", "No"], "No")];

    const randomQuestions = F.shuffle(questions).slice(0, NUM_QUESTIONS);

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

class Question<T extends Readonly<string[]> = Readonly<string[]>> {
    constructor(public question: string, public answers: T, public correct: T[number]) {}
    async ask(ctx: ExtendedContext): Promise<[boolean, string]> {
        const embed = new MessageEmbed()
            .setTitle(this.question)
            .setFooter("Select the correct answer by hitting a button below");

        // prettier-ignore
        const actionRow = (<unknown>new MessageActionRow().addComponents(
            this.answers.map((answer, idx) => new MessageButton({
                label: answer,
                style: "PRIMARY",
                customID: `answer${idx}`
            }))
        )) as ComponentActionRow;

        await ctx.editOriginal({ embeds: [embed.toJSON()], components: [actionRow] });

        return new Promise((resolve) => {
            for (let idx = 0; idx < this.answers.length; idx++) {
                ctx.registerComponent(`answer${idx}`, async () => {
                    const answer = this.answers[idx];

                    if (answer === this.correct) resolve([true, answer]);
                    resolve([false, answer]);
                });
            }
        });
    }
}
