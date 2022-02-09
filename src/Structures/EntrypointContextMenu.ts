import {
    ApplicationCommandData,
    ApplicationCommandType,
    ContextMenuCommandInteraction,
    GuildMember,
    Message,
    TextChannel
} from "discord.js/packages/discord.js";
import { CommandError } from "../Configuration/definitions";
import { ApplicationData, ContextMenus } from "./data";
import { InteractionEntrypoint } from "./EntrypointBase";

type TargetTypes = {
    [ApplicationCommandType.Message]: Message;
    [ApplicationCommandType.User]: GuildMember;
};

export type ContextMenuHandler<T extends keyof TargetTypes> = (
    ctx: CtxMenuInteraction,
    target: TargetTypes[T]
) => Promise<unknown>;

type CtxMenuInteraction = ContextMenuCommandInteraction & { member: GuildMember; channel: TextChannel };

export abstract class ContextMenu<T extends keyof TargetTypes> extends InteractionEntrypoint<ContextMenuHandler<T>> {
    public commandData: ApplicationCommandData;

    static GenericContextType: CtxMenuInteraction;

    constructor(public name: string, type: T) {
        super();
        this.commandData = { type, name };
    }
    protected abstract getTarget(ctx: CtxMenuInteraction): TargetTypes[T];

    async _run(ctx: CtxMenuInteraction): Promise<void> {
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

    getTarget(ctx: CtxMenuInteraction) {
        const member = ctx.options.getMember("user");
        if (!member) throw new CommandError("Failed to get member");
        return member as GuildMember;
    }
}

export class MessageContextMenu extends ContextMenu<ApplicationCommandType.Message> {
    constructor(name: string) {
        super(name, ApplicationCommandType.Message);
    }

    getTarget(ctx: CtxMenuInteraction) {
        const msg = ctx.options.getMessage("message", false);
        if (!msg) throw new CommandError("Failed to get message");
        return msg as Message;
    }
}
