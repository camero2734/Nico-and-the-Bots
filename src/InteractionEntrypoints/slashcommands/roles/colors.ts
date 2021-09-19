import { MessageEmbed } from "discord.js";
import { channelIDs, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Chooses a color role purchased from the shop",
    options: [
        {
            name: "role",
            description: "The role you wish to equip/unequip",
            type: "ROLE",
            required: false
        }
    ]
});

command.setHandler(async (ctx) => {
    const role = ctx.opts.role;

    if (ctx.user.id !== userIDs.me) return ctx.send({ content: "This command is disabled." });

    const userRoles = await prisma.colorRole.findMany({
        where: { userId: ctx.user.id }
    });

    const roleIDs = userRoles.map((r) => r.roleId.toSnowflake());

    if (!roleIDs || roleIDs.length === 0) {
        throw new CommandError(`You don't have any color roles! Visit <#${channelIDs.shop}> to learn how to get them.`);
    }

    if (!role) {
        const embed = new MessageEmbed()
            .setTitle("Your Color Roles")
            .setDescription(roleIDs.map((r) => `<@&${r}>`).join("\n"))
            .addField(
                "How do I choose one?",
                `To equip one of the roles you own, mention the role in the optional parameter of this command. For example, you can say:\n\n/roles color <@&${roleIDs[0]}>`
            );

        return ctx.send({ embeds: [embed] });
    }

    // User has valid roles and requested one

    // Not a valid role
    if (!roleIDs.includes(role)) {
        throw new CommandError(`You don't own this color role (or it is not a color role)`);
    }

    // All good - remove any current color roles and add the requested one
    const currentlyEquippedRoles = [...ctx.member.roles.cache.values()]
        .filter((r) => roleIDs.includes(r.id))
        .map((r) => r.id);

    // Remove all color roles
    for (const id of currentlyEquippedRoles) {
        await ctx.member.roles.remove(id);
    }

    // If they requested a role they already had, leave them with no color roles
    if (currentlyEquippedRoles.includes(role)) {
        const embed = new MessageEmbed().setTitle("Success!").setDescription("Removed your color role");
        return ctx.send({ embeds: [embed] });
    }

    // Otherwise add the role they requested
    await ctx.member.roles.add(role);
    const embed = new MessageEmbed().setTitle("Success!").setDescription(`You now have the <@&${role}> color role!`);
    return ctx.send({ embeds: [embed] });
});

export default command;
