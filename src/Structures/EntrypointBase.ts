/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApplicationCommandData, Collection, Guild, GuildMember, Interaction, Snowflake } from "discord.js";
import { channelIDs, roles } from "../Configuration/config";
import { CommandError } from "../Configuration/definitions";
import { ErrorHandler } from "./Errors";
import { EntrypointEvents } from "./Events";
import { InteractionListener, ListenerCustomIdGenerator, createInteractionListener } from "./ListenerInteraction";
import { ReactionListener } from "./ListenerReaction";
import { ApplicationData, InteractionHandlers, ReactionHandlers } from "./data";

export abstract class InteractionEntrypoint<
    HandlerType extends (...args: any[]) => Promise<unknown>,
    HandlerArgs extends any[] = []
> {
    public interactionListeners = new Collection<string, InteractionListener>();
    public reactionListeners = new Collection<string, ReactionListener>();

    public identifier: string;
    protected handler: HandlerType;
    public abstract commandData: ApplicationCommandData;

    private commandPermissions = new Collection<Snowflake, boolean>([[roles.staff, true]]);

    public getPermissions() {
        return this.commandPermissions.clone();
    }

    public addPermission(id: Snowflake, permission: boolean) {
        this.commandPermissions.set(id, permission);
    }

    public clearPermissions() {
        this.commandPermissions = new Collection<Snowflake, boolean>();
    }

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

            const member = ctx.member as GuildMember;
            if (!member) throw new Error(`No member`);

            const allowedAnywhere = ["tags", "fm"];

            if (ctx.isCommand()) {
                if (!member.roles.cache.has(roles.staff)) {
                    if (
                        ctx.commandName === "staff" ||
                        (ctx.channelId !== channelIDs.commands && !allowedAnywhere.includes(ctx.commandName))
                    ) {
                        throw new CommandError("You don't have permission to use this command!");
                    }
                }
            } else {
                // Check permissions
                const permissions = this.getPermissions();
                let canUse = false;
                let canUseBy: "USER" | "ROLE" | undefined = undefined;
                for (const [id, value] of permissions.entries()) {
                    if (member.id === id) {
                        canUseBy = "USER";
                        canUse = value;
                    } else if (member.roles.cache.has(id) && canUseBy !== "USER") {
                        canUseBy = "ROLE";
                        canUse = value;
                    }
                }
                if (!canUse) throw new CommandError("You don't have permission to use this command!");
            }

            EntrypointEvents.emit("entrypointStarted", { entrypoint: this, ctx });
            await this._run(ctx, ...HandlerArgs);
            EntrypointEvents.emit("entrypointFinished", { entrypoint: this, ctx });
        } catch (e) {
            EntrypointEvents.emit("entrypointErrored", { entrypoint: this, ctx });
            ErrorHandler(ctx, e);
        }
    }

    protected abstract _register(path: string[]): string;

    register(path: string[]): void {
        for (const [name, listener] of this.interactionListeners) InteractionHandlers.set(name, listener);
        for (const [name, listener] of this.reactionListeners) ReactionHandlers.set(name, listener);

        this.identifier = this._register(path);
    }

    static async registerAllCommands(guild: Guild): Promise<void> {
        try {
            await guild.commands.set(ApplicationData);
        } catch {
            //
        }

        // TODO: When Discord makes their permission system more granular
        // guild.commands.permissions.set()
    }
}
