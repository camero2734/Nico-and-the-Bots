import { MessageEmbed, Snowflake } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const names = <const>["role1", "role2", "role3", "role4", "role5"];

const command = new SlashCommand(<const>{
    description: "Retrieves information for a role",
    options: names.map(
        (name, idx) =>
            <const>{
                name,
                description: `Role #${idx} to look up information for`,
                required: idx === 0,
                type: "ROLE"
            }
    )
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();
    const roles = Object.values(ctx.opts).filter((r): r is Snowflake => !!r);

    const embeds: MessageEmbed[] = [];

    for (const roleID of roles) {
        const role = ctx.channel.guild.roles.cache.get(roleID);
        if (!role) continue;

        const embed = new MessageEmbed();
        embed.setTitle(role.name);
        embed.setColor(role.color);
        embed.addField("Hex", role.hexColor);
        embed.addField("Members", `${role.members.size}`);
        embed.addField("Created", `${role.createdAt}`);
        embed.addField("ID", role.id);

        embeds.push(embed);
    }

    if (embeds.length === 0) throw new CommandError("A valid role was not provided.");

    await ctx.send({ embeds });
});

export default command;
