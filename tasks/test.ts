
import { Faker, en } from '@faker-js/faker';
import { roundToNearestMinutes, startOfDay } from 'date-fns';

export function generateWords(seed: number) {
    const faker = new Faker({ locale: [en] });
    faker.seed(seed);
    return [
        faker.word.adverb(),
        faker.word.verb(),
        faker.word.adjective(),
        faker.word.adjective(),
        faker.word.noun(),
    ].join(" ");
}

;
const seed = startOfDay(roundToNearestMinutes(new Date(), { nearestTo: 30 })).getTime() ^ +"470410168186699788";
console.log(seed, `${startOfDay(roundToNearestMinutes(new Date(), { nearestTo: 30 })).getTime()} ^ ${+470410168186699788} = ${seed}`);
console.log(generateWords(seed));
