import { CommandOptionType } from "slash-create";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import * as R from "ramda";
import { channelIDs, roles } from "configuration/config";
import { Item } from "database/entities/Item";

export const Options: CommandOptions = {
    description: "Overwrites all of your pronoun roles with up to three that you specify",
    options: [
        {
            name: "role",
            description: "The role you wish to equip/unequip",
            type: CommandOptionType.ROLE,
            required: false
        }
    ]
};

export const Executor: CommandRunner<{ role?: Snowflake }> = async (ctx) => {
    const role = ctx.opts.role;

    const userRoles = (await ctx.connection.getRepository(Item).find({ id: ctx.user.id, type: "ColorRole" }) || []).map(r => r.title); // prettier-ignore

    if (!userRoles) {
        throw new CommandError(`You don't have any color roles! Visit <#${channelIDs.shop}> to learn how to get them.`);
    }

    if (!role) {
        const embed = new MessageEmbed()
            .setTitle("Your Color Roles")
            .setDescription(userRoles.map((r) => `<@&${r}>`).join("\n"))
            .addField(
                "How do I choose one?",
                `To equip one of the roles you own, mention the role in the optional parameter of this command. For example, you can say:\n\n/roles color <@&${userRoles[0]}>`
            );

        return ctx.send({ embeds: [embed.toJSON() as Record<string, unknown>] });
    }

    // User has valid roles and requested one

    // Not a valid role
    if (!userRoles.includes(role)) {
        throw new CommandError(`You don't have this color role (or it is not a color role)`);
    }

    // All good - remove any current color roles and add the requested one
    const currentlyEquippedRoles = ctx.member.roles.cache
        .array()
        .filter((r) => userRoles.includes(r.id))
        .map((r) => r.id);

    // Remove all color roles
    for (const id of currentlyEquippedRoles) {
        await ctx.member.roles.remove(id);
    }

    // If they requested a role they already had, leave them with no color roles
    if (currentlyEquippedRoles.includes(role)) {
        const embed = new MessageEmbed().setTitle("Success!").setDescription("Removed your color role");
        return ctx.send({ embeds: [embed.toJSON() as Record<string, unknown>] });
    }

    // Otherwise add the role they requested
    await ctx.member.roles.add(role);
    const embed = new MessageEmbed().setTitle("Success!").setDescription(`You now have the <@&${role}> color role!`);
    return ctx.send({ embeds: [embed.toJSON() as Record<string, unknown>] });
};
