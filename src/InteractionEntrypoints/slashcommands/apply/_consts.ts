import type { Faker } from "@faker-js/faker";
import { hoursToMilliseconds, subDays } from "date-fns";
import type { Snowflake } from "discord.js";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import type { Question } from "../../../Helpers/verified-quiz/question";
import QuizQuestions from "../../../Helpers/verified-quiz/quiz"; // .gitignored
import type { FirebreatherApplication } from ".prisma/client";

const VERIFIED_DELAY_HOURS = 12;
export const VerifiedQuizConsts = {
  NUM_QUESTIONS: 15,
  DELAY_BETWEEN_TAKING: hoursToMilliseconds(VERIFIED_DELAY_HOURS),
  DELAY_BETWEEN_TAKING_HOURS: VERIFIED_DELAY_HOURS,
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

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
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

export const FB_DELAY_DAYS = 14;

export async function getActiveFirebreathersApplication(userId: Snowflake): Promise<FirebreatherApplication | null> {
  return await prisma.firebreatherApplication.findFirst({
    where: {
      userId,
      OR: [
        { decidedAt: null }, // Hasn't been decided yet
        {
          // Recently denied application
          decidedAt: { not: null },
          submittedAt: { gt: subDays(new Date(), FB_DELAY_DAYS) },
          approved: false,
        },
      ],
    },
  });
}

export const genApplicationLink = (applicationId: string) =>
  `https://docs.google.com/forms/d/e/1FAIpQLSdhs01W8sAJTzp-lZNC0G2exKmNK1IcNsLtZuf5W-Zww_-p3w/viewform?usp=pp_url&entry.775451243=${applicationId}`;

// Morse code
const morseAlphabet: Record<string, string> = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
};

const reverseMorseAlphabet: Record<string, string> = Object.fromEntries(
  Object.entries(morseAlphabet).map(([k, v]) => [v, k]),
);

export function morseEncode(str: string, dotChar: string, dashChar: string) {
  return str
    .toLowerCase()
    .split("")
    .map((c) => morseAlphabet[c])
    .join("/")
    .replace(/\./g, dotChar)
    .replace(/\-/g, dashChar);
}

export function morseDecode(str: string) {
  return str
    .split(" ")
    .map((c) => reverseMorseAlphabet[c])
    .join("")
    .toUpperCase();
}

// Caesar cipher
const alphabet = "abcdefghijklmnopqrstuvwxyz";

export function caesarEncode(str: string, shift: number) {
  return str
    .toLowerCase()
    .split("")
    .map((c) => {
      const idx = alphabet.indexOf(c);
      if (idx === -1) return " ";

      return alphabet[(idx + shift) % alphabet.length];
    })
    .join("");
}

export function caesarDecode(str: string, shift: number) {
  return caesarEncode(str, -shift);
}

// Word generator
export function generateWords(faker: Faker) {
  return [
    faker.word.adverb(),
    faker.word.verb(),
    faker.word.adjective(),
    faker.word.adjective(),
    faker.word.noun(),
  ].join(" ");
}
