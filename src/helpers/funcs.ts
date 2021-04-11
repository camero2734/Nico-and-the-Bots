import * as R from "ramda";

/**
 * Just some commonly used short functions
 */

export default {
    titleCase: R.pipe(R.split(""), R.over(R.lensIndex(0), R.toUpper), R.join("")),
    // the default Object.entries function does not retain type information
    entries: <T extends Record<string, T[keyof T]>>(obj: T): [keyof T, T[keyof T]][] =>
        Object.entries(obj) as [keyof T, T[keyof T]][],
};
