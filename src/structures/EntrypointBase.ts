/* eslint-disable @typescript-eslint/no-explicit-any */
import { Collection, Interaction } from "discord.js";
import { ErrorHandler } from "./Errors";
import { createInteractionListener, InteractionListener, ListenerCustomIdGenerator } from "./ListenerInteraction";
import { ReactionListener } from "./ListenerReaction";

export abstract class BaseInteraction<
    HandlerType extends (...args: any[]) => Promise<unknown>,
    HandlerArgs extends any[] = []
> {
    public interactionListeners = new Collection<string, InteractionListener>();
    public reactionListeners = new Collection<string, ReactionListener>();

    protected handler: HandlerType;

    addInteractionListener<T extends Readonly<string[]>>(
        name: string,
        args: T,
        interactionHandler: ListenerCustomIdGenerator<T>
    ) {
        const [listenerName, listener, customIdGenerator] = createInteractionListener(name, args, interactionHandler);
        this.interactionListeners.set(listenerName, listener);
        return customIdGenerator;
    }
    addReactionListener(name: string, handler: ReactionListener): void {
        this.reactionListeners.set(name, handler);
    }

    abstract _run(ctx: Interaction, ...HandlerArgs: HandlerArgs): Promise<unknown>;

    // Wraps the _run function to catch errors and ensure the handler has been registered
    async run(ctx: Interaction, ...HandlerArgs: HandlerArgs): Promise<void> {
        try {
            if (!this.handler) throw new Error(`Handler not registered for ${this.constructor.name}`);
            await this._run(ctx, ...HandlerArgs);
        } catch (e) {
            ErrorHandler(ctx, e);
        }
    }
}
