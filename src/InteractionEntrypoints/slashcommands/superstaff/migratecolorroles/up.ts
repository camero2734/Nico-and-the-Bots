import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { changes } from "./_consts";
import { roles, userIDs } from "Configuration/config";
import { ApplicationCommandOptionType } from "discord.js";
import { EmbedBuilder } from "discord.js";

const COLOR_ROLE_IDENTIFIER = "⁣"; // Invisible character used to identify color roles

const toColorRoleName = (name: string) => `${name}${COLOR_ROLE_IDENTIFIER}`;

const command = new SlashCommand({
  description: "Makes changes",
  options: [
    {
      name: "actual",
      description: "Actually run the migration; otherwise it's a dry run",
      required: false,
      type: ApplicationCommandOptionType.Boolean,
    },
  ],
});

async function calculateRoleChanges(ctx: typeof command.ContextType) {
  const colorRoles = Object.values(roles.colors).flatMap((x) => Object.values(x));
  const existingRoles = new Set<string>();
  const rolesAfterChange = new Set<string>();
  for (const roleId of colorRoles) {
    const role = ctx.guild.roles.cache.get(roleId);
    if (!role) throw new Error(`Role with ID ${roleId} not found in guild`);
    existingRoles.add(role.name);
    rolesAfterChange.add(role.name);
  }

  for (const change of changes) {
    switch (change.type) {
      case "add": {
        // const role = await ctx.guild.roles.create({
        //   name: change.name,
        //   color: change.color,
        //   reason: "Migrating color roles",
        // });
        rolesAfterChange.add(toColorRoleName(change.name));
        break;
      }
      case "delete": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.name));
        if (!role) throw new Error(`Role to delete not found: ${change.name}`);

        existingRoles.delete(toColorRoleName(change.name));
        rolesAfterChange.delete(toColorRoleName(change.name));
        // if (role) {
        //   await role.delete("Migrating color roles");
        // }
        break;
      }
      case "changeColor": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.name));
        if (!role) throw new Error(`Role to change color not found: ${change.name}`);
        existingRoles.delete(toColorRoleName(change.name));
        // if (role) {
        //   await role.setColor(change.to, "Migrating color roles");
        // }
        break;
      }
      case "rename": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.from));
        if (!role) throw new Error(`Role to rename not found: ${change.from}`);

        if (role.hexColor.toLowerCase() !== (change.expectedColor.primaryColor as string).toLowerCase()) {
          throw new Error(
            `Role color mismatch for ${change.from}: expected ${change.expectedColor.primaryColor}, got ${role.hexColor}`,
          );
        }

        rolesAfterChange.delete(toColorRoleName(change.from));
        rolesAfterChange.add(toColorRoleName(change.to));
        existingRoles.delete(toColorRoleName(change.from));
        // if (role) {
        //   await role.setName(change.to, "Migrating color roles");
        // }
        break;
      }
      case "changeAndRename": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.from));
        if (!role) throw new Error(`Role to change and rename not found: ${change.from}`);
        rolesAfterChange.delete(toColorRoleName(change.from));
        rolesAfterChange.add(toColorRoleName(change.to));
        existingRoles.delete(toColorRoleName(change.from));
        // if (role) {
        //   await role.setName(change.to, "Migrating color roles");
        //   await role.setColors(change.colorTo, "Migrating color roles");
        // }
        break;
      }
      case "noChange": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.name));

        if (!role) {
          throw new Error(`Role for noChange not found: ${change.name}`);
        }
        if (role.hexColor.toLowerCase() !== (change.expectedColor.primaryColor as string).toLowerCase()) {
          throw new Error(
            `Role color mismatch for ${change.name}: expected ${change.expectedColor.primaryColor}, got ${role.hexColor}`,
          );
        }

        existingRoles.delete(toColorRoleName(change.name));

        break;
      }
      default: {
        throw new Error(`Unhandled change type: ${JSON.stringify(change satisfies never)}`);
      }
    }
  }

  if (existingRoles.size > 0) {
    await ctx.editReply(
      `ERROR! Roles that were expected to be changed but were not modified: ${[...existingRoles].join(", ")}`,
    );
    return;
  }

  const embed = new EmbedBuilder().setTitle("Roles after migration").setDescription([...rolesAfterChange].join("\n"));
  return await ctx.editReply({ embeds: [embed] });
}

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  // const { actual } = ctx.opts;

  // Ensure all existing color roles have the special identifier
  const existingColorRoleIds = Object.values(roles.colors).flatMap((x) => Object.values(x));
  for (const roleId of existingColorRoleIds) {
    const role = ctx.guild.roles.cache.get(roleId);
    if (!role) throw new Error(`Role with ID ${roleId} not found in guild`);
    if (!role.name.endsWith(COLOR_ROLE_IDENTIFIER)) {
      console.log(`Would rename role: ${role.name} to ${role.name}${COLOR_ROLE_IDENTIFIER}`);
      await role.setName(`${role.name}${COLOR_ROLE_IDENTIFIER}`, "Adding color role identifier");
    }
  }

  if (ctx.user.id !== userIDs.me) {
    return await ctx.editReply("You do not have permission to use this command.");
  }

  try {
    await calculateRoleChanges(ctx);
  } catch (error) {
    return await ctx.editReply(
      `Error during role migration: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

export default command;
