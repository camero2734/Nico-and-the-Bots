import * as R from "ramda";
import {
    AnyComponentButton,
    ButtonStyle,
    ComponentActionRow,
    ComponentButton,
    ComponentButtonLink,
    ComponentType,
    PartialEmoji
} from "slash-create";

/**
 * Just some commonly used short functions
 */

export default {
    titleCase: R.pipe(R.split(""), R.adjust(0, R.toUpper), R.join("")),
    lerp: (n: number, low: number, high: number): number => n * (high - low) + low,
    unlerp: (n: number, low: number, high: number): number => (n - low) / (high - low),
    // the default Object.entries function does not retain type information
    entries: <T extends Record<string, T[keyof T]>>(obj: T): [keyof T, T[keyof T]][] =>
        Object.entries(obj) as [keyof T, T[keyof T]][],
    // Rerurns [0, 1, 2, ..., n]
    indexArray: R.times(R.identity)
};
