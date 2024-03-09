
import { faker } from '@faker-js/faker';
import F from '../src/Helpers/funcs';

// export function generateWords(seed: number) {
//     const faker = new Faker({ locale: [en] });
//     faker.seed(seed);
//     return [
//         faker.word.adverb(),
//         faker.word.verb(),
//         faker.word.adjective(),
//         faker.word.adjective(),
//         faker.word.noun(),
//     ].join(" ");
// }

// ;
// const seed = startOfDay(roundToNearestMinutes(new Date(), { nearestTo: 30 })).getTime() ^ +"470410168186699788";
// console.log(seed, `${startOfDay(roundToNearestMinutes(new Date(), { nearestTo: 30 })).getTime()} ^ ${+470410168186699788} = ${seed}`);
// console.log(generateWords(seed));

const r = F.hashToInt("47041016822353186234235325235235695788");
console.log(r, r.toString().length, r < Number.MAX_SAFE_INTEGER)
console.log(r.toString(36), r.toString(36).length);


console.log([
    faker.word.adverb(),
    faker.word.verb(),
    faker.word.adjective(),
    faker.word.adjective(),
    faker.word.noun(),
].join(" "));
