import {
    ApplicationCommandData,
    ApplicationCommandType,
    GuildMember,
    Interaction,
    Message,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";
import { CommandError } from "../Configuration/definitions";
import { InteractionEntrypoint } from "./EntrypointBase";
import { ApplicationData, ContextMenus } from "./data";

type TargetTypes = {
    [ApplicationCommandType.Message]: Message;
    [ApplicationCommandType.User]: GuildMember;
};

export type ContextMenuHandler<T extends keyof TargetTypes> = (
    ctx: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction,
    target: TargetTypes[T]
) => Promise<unknown>;

export abstract class ContextMenu<T extends keyof TargetTypes> extends InteractionEntrypoint<ContextMenuHandler<T>> {
    public commandData: ApplicationCommandData;

    static GenericContextType: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

    constructor(public name: string, type: T) {
        super();
        this.commandData = { type, name };
    }
    protected abstract getTarget(ctx: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction): TargetTypes[T];

    async _run(ctx: Interaction): Promise<void> {
        if (!ctx.isContextMenuCommand()) throw new CommandError("Not a context menu");

        const target = this.getTarget(ctx);
        await this.handler(ctx, target);
    }

    _register(): string {
        ApplicationData.push(this.commandData);

        ContextMenus.set(this.name, this);
        return this.name;
    }
}

export class UserContextMenu extends ContextMenu<ApplicationCommandType.User> {
    constructor(name: string) {
        super(name, ApplicationCommandType.User);
    }

    getTarget(ctx: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction) {
        const member = ctx.options.getMember("user");
        if (!member) throw new CommandError("Failed to get member");
        return member as GuildMember;
    }
}

export class MessageContextMenu extends ContextMenu<ApplicationCommandType.Message> {
    constructor(name: string) {
        super(name, ApplicationCommandType.Message);
    }

    getTarget(ctx: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction) {
        const msg = ctx.options.getMessage("message", false);
        if (!msg) throw new CommandError("Failed to get message");
        return msg as Message;
    }
}
