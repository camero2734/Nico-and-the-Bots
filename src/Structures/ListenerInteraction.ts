/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	Guild,
	GuildMember,
	Message,
	MessageComponentInteraction,
	ModalSubmitInteraction,
	Snowflake,
	TextChannel,
} from "discord.js";
import F from "../Helpers/funcs";

type RequiredDiscordValues = {
	member: GuildMember;
	guild: Guild;
	channel: TextChannel;
	guildId: Snowflake;
};

export type ListenerInteraction = (
	| MessageComponentInteraction
	| ModalSubmitInteraction
) &
	RequiredDiscordValues & { message: Message };

export type ListenerCustomIdGenerator<T extends Readonly<string[]> = []> = (
	ctx: ListenerInteraction,
	args: ReturnType<CustomIDPattern<T>["toDict"]>,
) => Promise<void>;

/**
 * Encodes/decodes key-value pairs into the customID field
 */
export class CustomIDPattern<T extends Readonly<string[]>> {
	constructor(
		public args: T,
		public delimiter = ":",
	) {}
	toDict(input: string): { [K in T[number]]: string } {
		const [_name, ...parts] = input.split(this.delimiter);
		const dict = {} as { [K in T[number]]: string };
		for (let i = 0; i < parts.length; i++) {
			const key: T[number] = this.args[i];
			dict[key] = parts[i];
		}
		return dict;
	}
}

export type InteractionListener = {
	name: string;
	handler: ListenerCustomIdGenerator<any>;
	pattern: CustomIDPattern<any>;
};

export const createInteractionListener = <T extends Readonly<string[]> = any>(
	name: string,
	args: T,
	interactionHandler: ListenerCustomIdGenerator<T>,
): [
	string,
	InteractionListener,
	(args: ReturnType<CustomIDPattern<T>["toDict"]>) => string,
] => {
	const argsHash = F.hash(args.join(",")).slice(0, 4); // Invalidate interactions when args are updated
	const encodedName = `${name}.${argsHash}`;
	const pattern = new CustomIDPattern(args);

	const customIdGenerator = (
		args: ReturnType<CustomIDPattern<T>["toDict"]>,
	): string => {
		// Ensure order is preserved
		const ordered = F.entries(args).sort(
			([key1], [key2]) =>
				pattern.args.indexOf(key1) - pattern.args.indexOf(key2),
		); // prettier-ignore
		const values = ordered.map((a) => a[1]);
		return [encodedName, ...values].join(pattern.delimiter);
	};

	return [
		encodedName,
		{ name, handler: interactionHandler, pattern },
		customIdGenerator,
	];
};
