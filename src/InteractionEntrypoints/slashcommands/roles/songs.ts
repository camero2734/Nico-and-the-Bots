import { Embed, ApplicationCommandOptionType } from "discord.js/packages/discord.js";
import { channelIDs, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
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

    const userRoles = await prisma.songRole.findMany({
        where: { userId: ctx.user.id }
    });

    const roleIDs = userRoles.map((r) => r.roleId.toSnowflake());

    if (!roleIDs || roleIDs.length === 0) {
        throw new CommandError(`You don't have any song roles!`);
    }

    if (!role) {
        const embed = new Embed()
            .setTitle("Your Song Roles")
            .setDescription(roleIDs.map((r) => `<@&${r}>`).join("\n"))
            .addField({
                name: "How do I choose one?",
                value: `To equip one of the roles you own, mention the role in the optional parameter of this command. For example, you can say:\n\n/roles song <@&${roleIDs[0]}>`
            });

        return ctx.send({ embeds: [embed] });
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
        const embed = new Embed().setTitle("Success!").setDescription("Removed your song role");
        return ctx.send({ embeds: [embed] });
    }

    // Otherwise add the role they requested
    await ctx.member.roles.add(role);
    const embed = new Embed().setTitle("Success!").setDescription(`You now have the <@&${role}> song role!`);
    return ctx.send({ embeds: [embed] });
});

export default command;
