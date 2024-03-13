import { Collection, Colors, EmbedBuilder } from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Receive your district assignment in DEMA",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is not available to you.");

    await ctx.deferReply({ ephemeral: true });

    const districtRoleIds = new Collection(Object.entries(roles.districts));
    const hasRole = ctx.member.roles.cache.intersect(districtRoleIds);

    if (hasRole.size > 0) throw new CommandError(`You have already been assigned to DST. ${hasRole.firstKey()?.toUpperCase()}.`);

    const district = districtRoleIds.randomKey();
    if (!district) throw new CommandError("Invalid district");

    const roleId = districtRoleIds.get(district);
    if (!roleId) throw new CommandError("Invalid roleId");

    const role = await ctx.guild.roles.fetch(roleId);
    if (!role) throw new CommandError("Invalid role");

    await ctx.member.roles.add(role);

    const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle("District assignment")
        .setDescription(`You have been assigned to DST. ${district.toUpperCase()} district in DEMA`);

    await ctx.editReply({ embeds: [embed] });
});

export default command;
