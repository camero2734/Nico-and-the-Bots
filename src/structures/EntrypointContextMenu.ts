import { ApplicationCommandData, ContextMenuInteraction, GuildMember, Message } from "discord.js";
import { CommandError } from "./Errors";
import { BaseInteraction } from "./EntrypointBase";

type TargetTypes = {
    MESSAGE: Message;
    USER: GuildMember;
};

export type ContextMenuHandler<T extends keyof TargetTypes> = (
    ctx: ContextMenuInteraction,
    target: TargetTypes[T]
) => Promise<unknown>;

export abstract class ContextMenu<T extends keyof TargetTypes> extends BaseInteraction<ContextMenuHandler<T>> {
    commandData: ApplicationCommandData;

    constructor(public name: string, type: T) {
        super();
        this.commandData = { type, name };
    }
    protected abstract getTarget(ctx: ContextMenuInteraction): TargetTypes[T];

    setHandler(handler: ContextMenuHandler<T>): this {
        this.handler = handler;
        return this;
    }

    async _run(ctx: ContextMenuInteraction): Promise<void> {
        const target = this.getTarget(ctx);
        await this.handler(ctx, target);
    }
}

export class UserContextMenu extends ContextMenu<"USER"> {
    constructor(name: string) {
        super(name, "USER");
    }

    getTarget(ctx: ContextMenuInteraction) {
        const member = ctx.options.getMember("user", false);
        if (!member) throw new CommandError("Failed to get member");
        return member as GuildMember;
    }
}

export class MessageContextMenu extends ContextMenu<"MESSAGE"> {
    constructor(name: string) {
        super(name, "MESSAGE");
    }

    getTarget(ctx: ContextMenuInteraction) {
        const msg = ctx.options.getMessage("message", false);
        if (!msg) throw new CommandError("Failed to get message");
        return msg as Message;
    }
}
