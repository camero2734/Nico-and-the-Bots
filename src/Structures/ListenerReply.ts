import { Message } from "discord.js";

export type ReplyListener = (
	reply: Message,
	repliedTo: Message,
) => Promise<unknown>;
