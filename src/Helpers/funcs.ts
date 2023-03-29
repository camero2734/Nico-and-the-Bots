import * as bigintConversion from "bigint-conversion";
import { Guild, GuildMember, Message, MessageOptions, Snowflake, TextChannel } from "discord.js";
import radix64Setup from "radix-64";
import * as R from "ramda";
import * as crypto from "crypto";
import { channelIDs } from "../Configuration/config";
import { Canvas, CanvasRenderingContext2D } from "canvas";
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
    relative: "R"
};

const F = {
    titleCase: (str: string) => str.split(" ").map(a => `${a[0].toUpperCase()}${a.slice(1).toLowerCase()}`).join(" "), // prettier-ignore
    lerp: (n: number, low: number, high: number): number => n * (high - low) + low,
    unlerp: (n: number, low: number, high: number): number => (n - low) / (high - low),
    // the default Object.entries function does not retain type information
    entries: <T extends Record<string, T[keyof T]>>(obj: T): [keyof T, T[keyof T]][] =>
        Object.entries(obj) as [keyof T, T[keyof T]][],
    // Rerurns [0, 1, 2, ..., n]
    indexArray: R.times(R.identity),
    randomIndexInArray: <U>(arr: U[]): number => Math.floor(Math.random() * arr.length),
    randomValueInArray: <U>(arr: U[]): U => arr[F.randomIndexInArray(arr)],
    sample: <U>(arr: U[], count: number): U[] => {
        const shuffled = F.shuffle(arr);
        return shuffled.slice(0, count);
    },
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
    wait: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
    snowflakeToRadix64: (id: Snowflake | string | number): string => {
        return radix64.encodeBuffer(bigintConversion.bigintToBuf(BigInt(id)) as Buffer);
    },
    radix64toSnowflake: (encoded: string): Snowflake => {
        return bigintConversion.bufToBigint(radix64.decodeToBuffer(encoded)).toString() as Snowflake;
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
    canvasFitText(ctx: CanvasRenderingContext2D, canvas: Canvas, text: string, font: string, opts?: { maxWidth?: number, maxFontSize?: number }): number {
        ctx.save();

        const maxWidth = opts?.maxWidth || canvas.width;
        let fontSize = opts?.maxFontSize || 100;

        do {
            ctx.font = `${fontSize}px ${font}`;
            const metrics = ctx.measureText(text);

            if (metrics.width < maxWidth) break;
        }
        while (fontSize-- > 10);

        ctx.restore();
        return fontSize;
    },
    plural(value: number | unknown[], ending = "s"): string {
        const count = typeof value === "number" ? value : value.length;
        return count === 1 ? "" : ending;
    },
    truncate(text: string, len: number): string {
        if (text.length <= len) return text;
        else return text.substring(0, len - 3) + "...";
    },
    discordTimestamp<T extends keyof typeof timestampTypes = "shortDateTime">(
        d: Date,
        format: T = "shortDateTime" as T
    ): `<t:${bigint}:${typeof timestampTypes[T]}>` {
        const time = Math.floor(d.getTime() / 1000).toString() as `${bigint}`;
        return `<t:${time}:${timestampTypes[format]}>`;
    },
    parseMessageUrl(url: string): { guildId: string; channelId: string; messageId: string } | undefined {
        const regex = /channels\/(?<guildId>\d*)\/(?<channelId>\d*)\/(?<messageId>\d*)/;

        const matches = url.match(regex) || [];

        const { guildId, channelId, messageId } = matches.groups || {};
        if (!guildId || !channelId || !messageId) return;

        return { guildId, channelId, messageId };
    },
    async fetchMessageFromUrl(url: string, guild: Guild): Promise<Message | undefined> {
        try {
            const ref = this.parseMessageUrl(url);
            if (!ref) return;

            const channel = (await guild.channels.fetch(ref.channelId)) as TextChannel;
            return await channel.messages.fetch(ref.messageId);
        } catch {
            return;
        }
    },
    hash(text: string, algorithm: "md5" | "sha1" | "sha256" = "sha1"): string {
        return crypto.createHash(algorithm).update(text).digest("base64");
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
    async sendMessageToUser(member: GuildMember, msgOpts: MessageOptions) {
        try {
            const dm = await member.createDM();
            await dm.send(msgOpts);
        } catch {
            const commandsChan = (await member.guild.channels.fetch(channelIDs.commands)) as TextChannel;
            await commandsChan.send({ ...msgOpts, content: `${member}\n\n${msgOpts.content ?? ""}` });
        }
    },
    ellipseText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        else return text.substring(0, maxLength - 3) + "...";
    }
};

export default F;
