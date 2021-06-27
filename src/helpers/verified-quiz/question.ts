/**
 * A file named quiz.ts needs to be created in this directory
 * with a default export of an array of these Question objects
 *
 * Purposefully .gitignored so no one can cheat :)
 */

export class Question<T extends Readonly<string[]> = Readonly<string[]>> {
    static QUESTION_NUMBER = 0;

    public correct: number; // The correct answer
    constructor(public question: string, public answers: T, public id: number) {
        // Only up to 16 answers are supported due to how the state is stored
        if (answers.length > 16) throw new Error("Only up to 16 answers are supported");

        // By default, the first answer is chosen as the correct answer
        this.correct = 0;
    }

    binaryID(numBits: number): string {
        if (this.id === -1) throw new Error("ID was never set");
        return this.id.toString(2).padStart(numBits, "0");
    }

    get hexID(): string {
        if (this.id === -1) throw new Error("ID was never set");
        return this.id.toString(16);
    }
}
