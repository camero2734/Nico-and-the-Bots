import { ContextMenuInteraction, Message } from "discord.js";
import { CommandError } from "../../configuration/definitions";
import ContextMenu from "./contextMenu";

export default class MessageContextMenu extends ContextMenu<"MESSAGE"> {
    constructor(name: string) {
        super(name, "MESSAGE");
    }

    getTarget(ctx: ContextMenuInteraction) {
        const msg = ctx.options.getMessage("message", false);
        if (!msg) throw new CommandError("Failed to get message");
        return msg as Message;
    }
}
