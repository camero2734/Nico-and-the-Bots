import { ActionRowBuilder, EmbedBuilder, RoleSelectMenuBuilder } from "discord.js";
import { channelIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Chooses a color role purchased from the shop",
    options: []
});

command.setHandler(async (ctx) => {
    const userRoles = await prisma.colorRole.findMany({
        where: { userId: ctx.user.id }
    });

    const roleIDs = userRoles.map((r) => r.roleId.toSnowflake());

    const actionRow = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents([
        new RoleSelectMenuBuilder()
            .setCustomId(roleSelectedId({ originalUserId: ctx.user.id }))
            .setMaxValues(1)
    ]);

    if (!roleIDs || roleIDs.length === 0) {
        throw new CommandError(`You don't have any color roles! Visit <#${channelIDs.shop}> to learn how to get them.`);
    }

    const embed = new EmbedBuilder()
        .setTitle("Your Color Roles")
        .setDescription(roleIDs.map((r) => `<@&${r}>`).join("\n"))
        .addFields([{
            name: "How do I choose one?",
            value: `To equip one of the roles you own, search for it in the input bar below`
        }]);

    return ctx.send({ embeds: [embed], components: [actionRow] });
});

const roleSelectedId = command.addInteractionListener("roleSelected", ["originalUserId"], async (ctx, args) => {
    if (!ctx.isRoleSelectMenu()) return;
    if (args.originalUserId !== ctx.user.id) return;

    await ctx.deferUpdate();

    const role = ctx.roles.first();
    if (!role) return;

    const roleIds = (await prisma.colorRole.findMany({
        where: { userId: ctx.user.id },
        select: { roleId: true }
    })).map((r) => r.roleId);


    // Not a valid role
    if (!roleIds.includes(role.id)) {
        throw new CommandError(`You don't own this color role (or it is not a color role)`);
    }

    // All good - remove any current color roles and add the requested one
    const currentlyEquippedRoles = [...ctx.member.roles.cache.values()]
        .filter((r) => roleIds.includes(r.id))
        .map((r) => r.id);

    // Remove all color roles
    for (const id of currentlyEquippedRoles) {
        await ctx.member.roles.remove(id);
    }

    // If they requested a role they already had, leave them with no color roles
    if (currentlyEquippedRoles.includes(role.id)) {
        const embed = new EmbedBuilder().setTitle("Success!").setDescription("Removed your color role");
        await ctx.editReply({ embeds: [embed], components: [] });
        return;
    }

    // Otherwise add the role they requested
    await ctx.member.roles.add(role.id);
    const embed = new EmbedBuilder()
        .setTitle("Success!")
        .setDescription(`You now have the ${role} color role!`)
        .setColor(role.color);
    await ctx.message.edit({ embeds: [embed], components: [] });
})

export default command;
