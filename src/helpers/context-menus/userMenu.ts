import { ContextMenuInteraction, GuildMember } from "discord.js";
import { CommandError } from "../../configuration/definitions";
import ContextMenu from "./contextMenu";

export default class UserContextMenu extends ContextMenu<"USER"> {
    constructor(name: string) {
        super(name, "USER");
    }

    getTarget(ctx: ContextMenuInteraction) {
        const member = ctx.options.getMember("user", false);
        if (!member) throw new CommandError("Failed to get member");
        return member as GuildMember;
    }
}
