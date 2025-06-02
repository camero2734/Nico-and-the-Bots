import type { Canvas, SKRSContext2D } from "@napi-rs/canvas";
import * as bigintConversion from "bigint-conversion";
import * as crypto from "node:crypto";
import type {
	BaseMessageOptions,
	Guild,
	GuildMember,
	Message,
	Role,
	Snowflake,
	TextChannel,
} from "discord.js";
import radix64Setup from "radix-64";
import * as R from "ramda";
import { channelIDs, roles } from "../Configuration/config";
import { Faker, en } from "@faker-js/faker";
import type { BishopType } from "@prisma/client";
import countries from "iso-3166-1-alpha-2";
import { type TCountryCode, continents, getCountryData } from "countries-list";
/**
 * Just some commonly used short functions
 */

const radix64 = radix64Setup();

const base256Alphabet =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡ΢ΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώϏϐϑϒϓϔϕϖϗϘϙϚϛϜϝϞϟϠϡϢϣϤϥϦϧϨϩϪϫϬϭϮϯϰϱϲϳϴϵ϶ϷϸϹϺϻϼϽϾϿЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБ";

const timestampTypes = <const>{
	shortTime: "t",
	longTime: "T",
	shortDate: "d",
	longDate: "D",
	shortDateTime: "f",
	longDateTime: "F",
	relative: "R",
};

const F = {
	emoji: (id: string) => `<:emoji:${id}>`,
	titleCase: (str: string) =>
		str
			.split(" ")
			.map((a) => `${a[0].toUpperCase()}${a.slice(1).toLowerCase()}`)
			.join(" "), // prettier-ignore
	lerp: (n: number, low: number, high: number): number =>
		n * (high - low) + low,
	unlerp: (n: number, low: number, high: number): number =>
		(n - low) / (high - low),
	// the default Object.entries function does not retain type information
	entries: <T extends { [K in any]: any }>(obj: T): [keyof T, T[keyof T]][] =>
		Object.entries(obj) as [keyof T, T[keyof T]][],

	keys: <T extends Record<string, unknown>>(obj: T): (keyof T)[] =>
		Object.keys(obj) as (keyof T)[],
	values: <T extends Record<string, unknown>>(obj: T): T[keyof T][] =>
		Object.values(obj) as T[keyof T][],
	// Returns [0, 1, 2, ..., n]
	indexArray: R.times(R.identity),
	randomIndexInArray: <U>(arr: U[]): number =>
		Math.floor(Math.random() * arr.length),
	randomValueInArray: <U>(arr: U[]): U => arr[F.randomIndexInArray(arr)],
	sample: <U>(arr: U[], count: number): U[] => {
		const shuffled = F.shuffle(arr);
		return shuffled.slice(0, count);
	},
	randomSpecialCharacter: (): string =>
		F.randomValueInArray("!@#$%&_-+=?><~".split("")),
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
	wait: (ms: number): Promise<void> =>
		new Promise((resolve) => setTimeout(resolve, ms)),
	snowflakeToRadix64: (id: Snowflake | string | number): string => {
		return radix64.encodeBuffer(
			bigintConversion.bigintToBuf(BigInt(id)) as Buffer,
		);
	},
	radix64toSnowflake: (encoded: string): Snowflake => {
		return bigintConversion
			.bufToBigint(radix64.decodeToBuffer(encoded))
			.toString() as Snowflake;
	},
	shuffle: <T>(arr: T[]): T[] => {
		const array = [...arr];
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	},
	base256Encode(nums: Uint8Array): string {
		let str = "";
		for (const n of nums) {
			const char = base256Alphabet[n];
			str += char;
		}
		return str;
	},
	base256Decode(str: string): Uint8Array {
		const chars = str.split("");
		const arr = [];
		for (const char of chars) {
			const num = base256Alphabet.indexOf(char);
			arr.push(num);
		}
		return Uint8Array.from(arr);
	},
	// prettier-ignore
	canvasFitText(
		ctx: SKRSContext2D,
		canvas: Canvas,
		text: string,
		font: string,
		opts?: { maxWidth?: number; maxFontSize?: number },
	): number {
		ctx.save();

		const maxWidth = opts?.maxWidth || canvas.width;
		let fontSize = opts?.maxFontSize || 100;

		do {
			ctx.font = `${fontSize}px ${font}`;
			const metrics = ctx.measureText(text);

			if (metrics.width < maxWidth) break;
		} while (fontSize-- > 10);

		ctx.restore();
		return fontSize;
	},
	plural(value: number | unknown[], ending = "s"): string {
		const count = typeof value === "number" ? value : value.length;
		return count === 1 ? "" : ending;
	},
	truncate(text: string, len: number): string {
		if (text.length <= len) return text;
		return `${text.substring(0, len - 3)}...`;
	},
	discordTimestamp<T extends keyof typeof timestampTypes = "shortDateTime">(
		d: Date,
		format: T = "shortDateTime" as T,
	): `<t:${bigint}:${(typeof timestampTypes)[T]}>` {
		const time = Math.floor(d.getTime() / 1000).toString() as `${bigint}`;
		return `<t:${time}:${timestampTypes[format]}>`;
	},
	parseMessageUrl(
		url: string,
	): { guildId: string; channelId: string; messageId: string } | undefined {
		const regex =
			/channels\/(?<guildId>\d*)\/(?<channelId>\d*)\/(?<messageId>\d*)/;

		const matches = url.match(regex);

		const { guildId, channelId, messageId } = matches?.groups || {};
		if (!guildId || !channelId || !messageId) return;

		return { guildId, channelId, messageId };
	},
	async fetchMessageFromUrl(
		url: string,
		guild: Guild,
	): Promise<Message | undefined> {
		try {
			const ref = this.parseMessageUrl(url);
			if (!ref) return;

			const channel = (await guild.channels.fetch(
				ref.channelId,
			)) as TextChannel;
			return await channel.messages.fetch(ref.messageId);
		} catch {
			return;
		}
	},
	hash(text: string, algorithm: "md5" | "sha1" | "sha256" = "sha1"): string {
		return crypto.createHash(algorithm).update(text).digest("base64");
	},
	hashToInt(text: string): number {
		let h1 = 0xdeadbeef;
		let h2 = 0x41c6ce57;
		for (let i = 0, ch; i < text.length; i++) {
			ch = text.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
		h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
		h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
		h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

		return 4294967296 * (2097151 & h2) + (h1 >>> 0);
	},
	isValidURL(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch (err) {
			return false;
		}
	},
	hammingDist(a: Buffer, b: Buffer): number {
		const b1 = a.toString("binary");
		const b2 = b.toString("binary");

		const minLength = Math.min(b1.length, b2.length);
		const maxLength = Math.max(b1.length, b2.length);

		let count = 0;
		for (let i = 0; i < minLength; i++) {
			if (b1[i] !== b2[i]) count++;
		}
		return count + (maxLength - minLength);
	},
	// Tries to DM user, defaults to pinging in #commands
	async sendMessageToUser(member: GuildMember, msgOpts: BaseMessageOptions) {
		try {
			const dm = await member.createDM();
			await dm.send(msgOpts);
		} catch {
			const commandsChan = (await member.guild.channels.fetch(
				channelIDs.commands,
			)) as TextChannel;
			await commandsChan.send({
				...msgOpts,
				content: `${member}\n\n${msgOpts.content ?? ""}`,
			});
		}
	},
	ellipseText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return `${text.substring(0, maxLength - 3)}...`;
	},
	capitalize(text: string): string {
		return text.charAt(0).toUpperCase() + text.slice(1);
	},
	userBishop(member: GuildMember):
		| {
				name: keyof (typeof roles)["districts"];
				role: Role;
				bishop: BishopType;
		  }
		| undefined {
		const keys = F.entries(roles.districts);
		for (const [bishop, roleId] of keys) {
			const role = member.roles.cache.get(roleId);
			if (role)
				return {
					name: bishop,
					role,
					bishop: F.capitalize(bishop) as BishopType,
				};
		}
	},
	intColorToRGB(int: number): [number, number, number] {
		const r = (int >> 16) & 255;
		const g = (int >> 8) & 255;
		const b = int & 255;
		return [r, g, b];
	},
	isolatedFaker(seed: number | string) {
		const faker = new Faker({ locale: [en] });

		const fakerSeed = typeof seed === "string" ? F.hashToInt(seed) : seed;
		faker.seed(fakerSeed);

		return faker;
	},
	isoCountryToEmoji(country: string): string {
		const codePoints = country
			.toUpperCase()
			.split("")
			.map((c) => c.codePointAt(0)! - 65 + 0x1f1e6);
		return String.fromCodePoint(...codePoints);
	},
	isoCountryToContinent(country: string): string {
		const code = getCountryData(country as TCountryCode).continent;
		return continents[code];
	},
	countryNameToCode(name: string) {
		return countries.getCode(name);
	},
};

export default F;
