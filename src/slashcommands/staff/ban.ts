import { roles } from "../../configuration/config";
import { CommandError } from "../../configuration/definitions";
import { MessageEmbed } from "discord.js";
import { SlashCommand } from "../../structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Bans a member",
    options: [
        { name: "user", description: "The member to ban", required: true, type: "USER" },
        {
            name: "purge",
            description: "Whether to delete all messages or not",
            required: false,
            type: "BOOLEAN"
        },
        { name: "reason", description: "Reason for banning", required: false, type: "STRING" }
    ]
});

command.setHandler(async (ctx) => {
    const { user, purge } = ctx.opts;
    const member = await ctx.member.guild.members.fetch(user);
    if (!member) throw new CommandError("Could not find this member. They may have already been banned or left.");

    if (member.roles.cache.has(roles.staff) || member.user.bot) {
        throw new CommandError("You cannot ban a staff member or bot.");
    }

    await member.ban({ days: purge ? 7 : 0 });

    await ctx.send({ embeds: [new MessageEmbed({ description: `${member.toString()} was banned.` }).toJSON()] });
});

export default command;
