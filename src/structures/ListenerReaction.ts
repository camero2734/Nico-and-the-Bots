import { MessageReaction, User } from "discord.js";

export type ReactionListener = (
    reaction: MessageReaction,
    user: User,
    // Catches any errors that occur
    safeExecute: (promise: Promise<void>) => Promise<void>
) => Promise<boolean>;
