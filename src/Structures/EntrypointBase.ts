/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApplicationCommandData, Collection, Guild, Interaction } from "discord.js";
import { InteractionHandlers, ReactionHandlers } from "./data";
import { ErrorHandler } from "./Errors";
import { createInteractionListener, InteractionListener, ListenerCustomIdGenerator } from "./ListenerInteraction";
import { ReactionListener } from "./ListenerReaction";

export abstract class InteractionEntrypoint<
    HandlerType extends (...args: any[]) => Promise<unknown>,
    HandlerArgs extends any[] = []
> {
    public interactionListeners = new Collection<string, InteractionListener>();
    public reactionListeners = new Collection<string, ReactionListener>();

    public identifier: string;
    protected handler: HandlerType;
    public abstract commandData: ApplicationCommandData;

    setHandler(handler: HandlerType): this {
        this.handler = handler;
        return this;
    }

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

    protected abstract _register(path: string[]): string;

    register(path: string[]): void {
        for (const [name, listener] of this.interactionListeners) InteractionHandlers.set(name, listener);
        for (const [name, listener] of this.reactionListeners) ReactionHandlers.set(name, listener);

        this.identifier = this._register(path);
    }
}
