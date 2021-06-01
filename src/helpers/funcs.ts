import * as R from "ramda";

/**
 * Just some commonly used short functions
 */

const F = {
    titleCase: R.pipe(R.split(""), R.adjust(0, R.toUpper), R.join("")),
    lerp: (n: number, low: number, high: number): number => n * (high - low) + low,
    unlerp: (n: number, low: number, high: number): number => (n - low) / (high - low),
    // the default Object.entries function does not retain type information
    entries: <T extends Record<string, T[keyof T]>>(obj: T): [keyof T, T[keyof T]][] =>
        Object.entries(obj) as [keyof T, T[keyof T]][],
    // Rerurns [0, 1, 2, ..., n]
    indexArray: R.times(R.identity),
    randomValueInArray: <U, T extends Array<U>>(arr: T): T[number] => arr[Math.floor(Math.random() * arr.length)],
    randomSpecialCharacter: (): string => F.randomValueInArray("!@#$%&_-+=?><~".split("")),
    /**
     *
     * @param str The string to randomize
     * @param chance The probability of a character being randomized
     */
    randomizeLetters: (str: string, chance = 0.2): string => {
        const newStr = str.split("");
        for (let i = 0; i < str.length; i++) {
            if (Math.random() < chance) newStr[i] = F.randomSpecialCharacter();
        }
        return newStr.join("");
    },
    wait: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
};

export default F;
