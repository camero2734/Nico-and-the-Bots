// Import necessary testing utilities
import { test, describe, expect } from "bun:test";
import {
	findFirstUnmatchedSongs,
	type SongBattleHistory,
} from "./songbattle.consts";
import type { Poll } from "@prisma/client";

const constructPoll = (...options: string[]): Poll => ({
	options,
	id: 1,
	userId: "1",
	name: "poll",
});
const constructHistory = (
	id: string,
	rounds: number,
): [string, SongBattleHistory] => [id, { rounds, eliminations: 0 }];

// Test suite for findFirstUnmatchedSongs function
describe("findFirstUnmatchedSongs", () => {
	test("returns first two songs if they haven't been matched up yet", () => {
		const sorted = [
			constructHistory("song1", 1),
			constructHistory("song2", 1),
			constructHistory("song3", 1),
		];
		const previousBattlesRaw: Poll[] = [];

		const result = findFirstUnmatchedSongs(sorted, previousBattlesRaw);

		expect(result).toEqual({ song1Id: "song1", song2Id: "song2" });
	});

	test("skips previously matched", () => {
		const sorted = [
			constructHistory("song1", 1),
			constructHistory("song2", 1),
			constructHistory("song3", 1),
		];
		const previousBattlesRaw: Poll[] = [constructPoll("song1", "song2")];

		const result = findFirstUnmatchedSongs(sorted, previousBattlesRaw);

		expect(result).toEqual({ song1Id: "song1", song2Id: "song3" });
	});

	test("chooses minimum rounds if multiple songs are unmatched", () => {
		const sorted = [
			constructHistory("song1", 1),
			constructHistory("song2", 1),
			constructHistory("song3", 2),
			constructHistory("song4", 3),
		];
		const previousBattlesRaw: Poll[] = [
			constructPoll("song1", "song2"),
			constructPoll("song1", "song3"),
		];

		const result = findFirstUnmatchedSongs(sorted, previousBattlesRaw);

		expect(result).toEqual({ song1Id: "song2", song2Id: "song3" });
	});

	test("throws an error if all songs have been matched up", () => {
		const sorted = [
			constructHistory("song1", 1),
			constructHistory("song2", 1),
			constructHistory("song3", 1),
		];
		const previousBattlesRaw: Poll[] = [
			constructPoll("song1", "song2"),
			constructPoll("song1", "song3"),
			constructPoll("song2", "song3"),
		];

		expect(() => findFirstUnmatchedSongs(sorted, previousBattlesRaw)).toThrow(
			"All songs have been matched up",
		);
	});
});
