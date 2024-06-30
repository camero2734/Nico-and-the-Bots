import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { withCache } from "../../../Helpers/cache";

const command = new SlashCommand({
    description: "Chooses a song role that you own",
    options: [
        {
            name: "role",
            description: "The role you wish to equip/unequip",
            type: ApplicationCommandOptionType.Role,
            required: false
        }
    ]
});

command.setHandler(async (ctx) => {
    const role = ctx.opts.role;

    await ctx.deferReply({ ephemeral: true });

    const userRoles = await prisma.songRole.findMany({
        where: { userId: ctx.user.id }
    });

    const orderedRoleIds = await withCache('songs-role-id-cache', async () => {
        const roles = await ctx.guild.roles.fetch();
        return roles.sort((a, b) => a.position - b.position).map((r) => r.id);
    }, 3600);

    const roleIDs = userRoles.map((r) => r.roleId).sort((a, b) => {
        return orderedRoleIds.indexOf(b) - orderedRoleIds.indexOf(a)
    });

    if (!roleIDs || roleIDs.length === 0) {
        throw new CommandError(`You don't have any song roles!`);
    }

    if (!role) {
        const embed = new EmbedBuilder()
            .setTitle("Your Song Roles")
            .setDescription(roleIDs.map((r) => `<@&${r}>`).join("\n"))
            .addFields([{
                name: "How do I choose one?",
                value: `To equip one of the roles you own, mention the role in the optional parameter of this command. For example, you can say:\n\n/roles song <@&${roleIDs[0]}>`
            }]);

        return ctx.editReply({ embeds: [embed] });
    }

    // User has valid roles and requested one

    // Not a valid role
    if (!roleIDs.includes(role)) {
        throw new CommandError(`You don't own this song role (or it is not a song role)`);
    }

    // All good - remove any current song roles and add the requested one
    const currentlyEquippedRoles = [...ctx.member.roles.cache.values()]
        .filter((r) => roleIDs.includes(r.id))
        .map((r) => r.id);

    // Remove all song roles
    for (const id of currentlyEquippedRoles) {
        await ctx.member.roles.remove(id);
    }

    // If they requested a role they already had, leave them with no song roles
    if (currentlyEquippedRoles.includes(role)) {
        const embed = new EmbedBuilder().setTitle("Success!").setDescription("Removed your song role");
        return ctx.editReply({ embeds: [embed] });
    }

    // Otherwise add the role they requested
    await ctx.member.roles.add(role);
    const embed = new EmbedBuilder().setTitle("Success!").setDescription(`You now have the <@&${role}> song role!`);
    return ctx.editReply({ embeds: [embed] });
});

export default command;
