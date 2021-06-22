import { ExtendedContext } from "configuration/definitions";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { ComponentActionRow } from "slash-create";

/**
 * A file named quiz.ts needs to be created in this directory
 * with a default export of an array of these Question objects
 *
 * Purposefully .gitignored so no one can cheat :)
 */

export class Question<T extends Readonly<string[]> = Readonly<string[]>> {
    public correct: T[number]; // The correct answer
    public shuffle = true; // Whether or not to shuffle the answers
    constructor(public question: string, public answers: T, correct?: T[number]) {
        // By default, the first answer is chosen as the correct answer
        this.correct = correct || answers[0];
    }
    noShuffle(): this {
        this.shuffle = false;
        return this;
    }
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
