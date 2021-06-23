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
    static QUESTION_NUMBER = 0;

    public correct: T[number]; // The correct answer
    private id: number;
    constructor(public question: string, public answers: T, id?: number) {
        // Only up to 16 answers are supported due to how the state is stored
        if (answers.length > 16) throw new Error("Only up to 16 answers are supported");

        if (id === undefined) this.id = -1;
        else this.setID(id);

        // By default, the first answer is chosen as the correct answer
        this.correct = answers[0];
    }

    setID(id: number): this {
        // ID must be between 0 and 255 (inclusive)
        if (!Number.isInteger(id)) throw new Error("Question ID must be an integer");
        if (id < 0 || id > 255) throw new Error("Question ID must be in the range [0, 255]");
        this.id = id;
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
    get binaryID(): string {
        if (this.id === -1) throw new Error("ID was never set");
        return this.id.toString(2);
    }
}
