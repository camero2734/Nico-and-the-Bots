import { roles } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/Item";
import { MessageTools } from "helpers";
import parseDuration from "parse-duration";
import { Connection } from "typeorm";

export default new Command({
    name: "mute",
    aliases: ["timeout", "crate"],
    description: "Mutes a user",
    category: "Staff",
    usage: "!mute [@ user] [time]",
    example: "!mute @poot 5 minutes",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const timeoutMS = parseDuration(msg.argsString);
        const member = await MessageTools.getMentionedMember(msg);

        if (!member) throw new CommandError("I couldn't find a mentioned user");
        if (!timeoutMS) throw new CommandError("I couldn't interpret that period of time");

        if (member.roles.cache.has(roles.staff)) throw new CommandError("You cannot mute another staff member");

        member.roles.add(roles.muted);
        member.roles.remove(roles.banditos);

        const timeoutEndsAt = Date.now() + timeoutMS;

        await connection
            .getRepository(Item)
            .createQueryBuilder()
            .delete()
            .where("type = :type", { type: "Timeout" })
            .andWhere("id = :id", { id: member.id })
            .execute();

        const newTimeout = new Item({ id: member.id, title: msg.author.id, type: "Timeout", time: timeoutEndsAt });
        await connection.manager.save(newTimeout);

        const durationMinutes = Math.floor(timeoutMS / (1000 * 60));
        await msg.channel.send(
            MessageTools.textEmbed(`${member} has successfully been muted for ${durationMinutes} minutes`)
        );
    }
});
