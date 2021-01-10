import { roles } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { OverwriteResolvable } from "discord.js";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

interface JailProps {
    autojail: boolean;
}

export default new Command({
    name: "jail",
    description:
        "Creates a jail channel for mentioned user(s) and locks them into only seeing that channel until a staff member ends it",
    category: "Staff",
    usage: "!jail [@user] (@user)...",
    example: "!jail @poot",
    async cmd(msg: CommandMessage<JailProps>, connection: Connection): Promise<void> {
        const IS_DE = false;
        if (!msg.member.roles.cache.get(roles.staff) && !msg.props.autojail) return;

        const mentions = msg.mentions.members?.array();
        if (!mentions || mentions.length < 1) throw new CommandError("You must @ at least one user!");
        const channelName = `${mentions.map((m) => m.displayName.replace(/[^A-z0-9]/g, "")).join("-")}-chilltown`;

        const permissionOverwrites: OverwriteResolvable[] = [
            {
                deny: ["VIEW_CHANNEL"],
                id: msg.guild.id // everyone
            },
            {
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
                id: roles.staff
            },
            {
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
                id: roles.bots
            },
            {
                deny: ["SEND_MESSAGES"],
                id: roles.muted
            }
        ];
        for (const member of mentions) {
            const isDE = !!member.roles.cache.get(roles.deatheaters);
            permissionOverwrites.push({ allow: ["VIEW_CHANNEL"], id: member.user.id });
            if (isDE) {
                await member.roles.remove(roles.deatheaters); // Remove DE
                if (msg.props.autojail) {
                    let jailItem = await connection.getRepository(Item).findOne({ id: member.user.id, type: "DEJail" });
                    if (!jailItem) jailItem = new Item({ id: member.user.id, type: "DEJail", title: "" });

                    jailItem.save();
                } else {
                    await member.roles.add(roles.jailedDE); // Add Jail DE (DE back after jail ends)
                }
            }
            if (member.roles.cache.get(roles.gold)) {
                await member.roles.remove(roles.gold); // Remove Gold
            }
            await member.roles.add(roles.muted); // Add muted
            await member.roles.add(roles.hideallchannels); // Add hideallchannels
        }

        const c = await msg.guild.channels.create(channelName, { type: "text", permissionOverwrites });
        c.setParent("625524136785215498");
        await msg.channel.send(MessageTools.textEmbed(`Created channel <#${c.id}>`));

        await c.send(
            `Hello, ${mentions.map((m) => m.toString()).join(" ")}. You have ${
                msg.props.autojail ? "**automatically** " : ""
            }been added to "jail", which means ${
                msg.props.autojail
                    ? "you have received at least three warnings."
                    : "your conduct has fallen below what is expected of this server."
            }${
                msg.props.autojail && IS_DE
                    ? "\n\n⚠️ You have also permanently lost your DE role. You may reapply in **two weeks** to be reconsidered."
                    : ""
            }\n\n**Please wait for a staff member.**\n\n__Note for staff:__\nAll users are muted by default. You must \`!unmute\` them.`
        );
    }
});
