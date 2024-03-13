import { Colors, EmbedBuilder } from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Receive your district assignment in DEMA",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is not available to you.");

    await ctx.deferReply({ ephemeral: true });

    // Make sure the user doesn't already have a district role
    const districtRoleIds = Object.values(roles.districts);
    const hasRole = ctx.member.roles.cache.find(r => (districtRoleIds as string[]).includes(r.id));
    if (hasRole) throw new CommandError(`You have already been assigned to ${hasRole.name.toUpperCase()}.`);

    // Assign a district role
    const assignedRoleId = F.randomValueInArray(districtRoleIds);
    const role = await ctx.guild.roles.fetch(assignedRoleId);
    if (!role) throw new CommandError("Invalid role");

    await ctx.member.roles.add(role);

    const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle("District assignment")
        .setDescription(`You have been assigned to ${role.name}`);

    await ctx.editReply({ embeds: [embed] });
});

export default command;
