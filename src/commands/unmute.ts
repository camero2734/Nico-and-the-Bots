import { roles } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/Item";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

export default new Command({
    name: "unmute",
    description: "Unmutes a user",
    category: "Staff",
    usage: "!unmute [@ user]",
    example: "!unmute @poot",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const member = await MessageTools.getMentionedMember(msg);

        if (!member) throw new CommandError("I couldn't find a mentioned user");

        await member.roles.remove(roles.muted);
        await member.roles.add(roles.banditos);

        await connection
            .getRepository(Item)
            .createQueryBuilder()
            .delete()
            .where("type = :type", { type: "Timeout" })
            .andWhere("id = :id", { id: member.id })
            .execute();

        await msg.channel.send(MessageTools.textEmbed(`${member} **is no longer muted!**`));
    }
});
