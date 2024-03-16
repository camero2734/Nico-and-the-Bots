import { EmbedBuilder, Snowflake, ApplicationCommandOptionType } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import F from "../../../Helpers/funcs";

const names = <const>["role1", "role2", "role3", "role4", "role5"];

const command = new SlashCommand({
    description: "Retrieves information for a role",
    options: names.map(
        (name, idx) =>
            <const>{
                name,
                description: `Role #${idx} to look up information for`,
                required: idx === 0,
                type: ApplicationCommandOptionType.Role
            }
    )
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();
    const roles = Object.values(ctx.opts).filter((r): r is Snowflake => !!r);

    const embeds: EmbedBuilder[] = [];

    await ctx.guild.members.fetch();

    for (const roleID of roles) {
        const role = await ctx.channel.guild.roles.fetch(roleID);
        if (!role) continue;

        const embed = new EmbedBuilder();
        embed.setTitle(role.name);
        embed.setColor(role.color);
        embed.addFields([{ name: "Hex", value: role.hexColor }]);
        embed.addFields([{ name: "RGB", value: `(${F.intColorToRGB(role.color).join(", ")})` }]);
        embed.addFields([{ name: "Members", value: `${role.members.size}` }]);
        embed.addFields([{ name: "Created", value: `${role.createdAt}` }]);
        embed.addFields([{ name: "ID", value: role.id }]);

        embeds.push(embed);
    }

    if (embeds.length === 0) throw new CommandError("A valid role was not provided.");

    await ctx.send({ embeds });
});

export default command;
