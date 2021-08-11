import { ApplicationCommandData, ContextMenuInteraction, GuildMember, Message } from "discord.js";
import { ErrorHandler } from "../slash-command";

type TargetTypes = {
    MESSAGE: Message;
    USER: GuildMember;
};

export type ContextMenuHandler<T extends keyof TargetTypes> = (
    ctx: ContextMenuInteraction,
    target: TargetTypes[T]
) => Promise<unknown>;

export default abstract class ContextMenu<T extends keyof TargetTypes> {
    #handler: ContextMenuHandler<T>;
    commandData: ApplicationCommandData;

    constructor(public name: string, type: T) {
        this.commandData = { type, name };
    }
    protected abstract getTarget(ctx: ContextMenuInteraction): TargetTypes[T];

    setHandler(handler: ContextMenuHandler<T>): this {
        this.#handler = handler;
        return this;
    }

    async run(ctx: ContextMenuInteraction): Promise<void> {
        if (!this.#handler) throw new Error("Invalid command handler");

        const target = this.getTarget(ctx);

        try {
            await this.#handler(ctx, target);
        } catch (e) {
            ErrorHandler(ctx, e);
        }
    }
}
