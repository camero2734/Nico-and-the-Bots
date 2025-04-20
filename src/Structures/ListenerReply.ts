import { Message } from "discord.js";

export type ReplyListener = (reply: Message) => Promise<unknown>;
