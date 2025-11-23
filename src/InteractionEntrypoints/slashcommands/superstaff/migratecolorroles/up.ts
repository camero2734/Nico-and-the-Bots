import { roles, userIDs } from "Configuration/config";
import F from "Helpers/funcs";
import { prisma } from "Helpers/prisma-init";
import { addColorRole } from "Tasks/colorroles/add";
import { deleteColorRole } from "Tasks/colorroles/delete";
import { notifyChange } from "Tasks/colorroles/notify";
import { recolorColorRole } from "Tasks/colorroles/recolor";
import { renameColorRole } from "Tasks/colorroles/rename";
import { renameAndRecolorColorRole } from "Tasks/colorroles/renameandrecolor";
import { ApplicationCommandOptionType, EmbedBuilder, type Role } from "discord.js";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { type Change, changes } from "./_consts";

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

type ExtendedChange = Change & { inInventory?: number; withRole?: number; role?: Role };

async function calculateRoleChanges(ctx: typeof command.ContextType): Promise<ExtendedChange[]> {
  const colorRoles = Object.values(roles.colors).flatMap((x) => Object.values(x));
  const existingRoles = new Set<string>();
  const rolesAfterChange = new Set<string>();

  const extendedChanges: ExtendedChange[] = changes;

  for (const roleId of colorRoles) {
    const role = ctx.guild.roles.cache.get(roleId);
    if (!role) throw new Error(`Role with ID ${roleId} not found in guild`);
    existingRoles.add(role.name);
    rolesAfterChange.add(role.name);
  }

  const beforeRoleCount = existingRoles.size;

  for (const change of extendedChanges) {
    switch (change.type) {
      case "add": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.name));
        if (role) {
          throw new Error(`Role to add already exists: ${change.name}`);
        }

        rolesAfterChange.add(toColorRoleName(change.name));
        break;
      }
      case "delete": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.name));
        if (!role) throw new Error(`Role to delete not found: ${change.name}`);

        existingRoles.delete(toColorRoleName(change.name));
        rolesAfterChange.delete(toColorRoleName(change.name));

        const withRole = await role.guild.roles.fetch(role.id).then((r) => r?.members.size ?? 0);
        const inInventory = await prisma.colorRole.count({ where: { roleId: role.id } });

        change.withRole = withRole;
        change.inInventory = inInventory;
        change.role = role;
        break;
      }
      case "changeColor": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.name));
        if (!role) throw new Error(`Role to change color not found: ${change.name}`);
        existingRoles.delete(toColorRoleName(change.name));

        const withRole = await role.guild.roles.fetch(role.id).then((r) => r?.members.size ?? 0);
        const inInventory = await prisma.colorRole.count({ where: { roleId: role.id } });

        change.withRole = withRole;
        change.inInventory = inInventory;
        change.role = role;
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

        const withRole = await role.guild.roles.fetch(role.id).then((r) => r?.members.size ?? 0);
        const inInventory = await prisma.colorRole.count({ where: { roleId: role.id } });

        change.withRole = withRole;
        change.inInventory = inInventory;
        change.role = role;

        break;
      }
      case "renameAndRecolor": {
        const role = ctx.guild.roles.cache.find((r) => r.name === toColorRoleName(change.from));
        if (!role) throw new Error(`Role to change and rename not found: ${change.from}`);

        if (role.hexColor.toLowerCase() === (change.colorTo.primaryColor as string).toLowerCase()) {
          throw new Error(
            `Role is already the expected color for ${change.from}: expected ${change.colorTo.primaryColor}, got ${role.hexColor}`,
          );
        }

        rolesAfterChange.delete(toColorRoleName(change.from));
        rolesAfterChange.add(toColorRoleName(change.to));
        existingRoles.delete(toColorRoleName(change.from));

        const withRole = await role.guild.roles.fetch(role.id).then((r) => r?.members.size ?? 0);
        const inInventory = await prisma.colorRole.count({ where: { roleId: role.id } });

        change.withRole = withRole;
        change.inInventory = inInventory;
        change.role = role;

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
        change.withRole = await role.guild.roles.fetch(role.id).then((r) => r?.members.size ?? 0);
        change.inInventory = await prisma.colorRole.count({ where: { roleId: role.id } });
        change.role = role;

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
    throw new Error("Some roles were not modified as expected.");
  }

  const deleteChanges = extendedChanges.filter((c) => c.type === "delete");
  const renameChanges = extendedChanges.filter((c) => c.type === "rename");
  const renameAndRecolorChanges = extendedChanges.filter((c) => c.type === "renameAndRecolor");
  const changeColorChanges = extendedChanges.filter((c) => c.type === "changeColor");
  const addChanges = extendedChanges.filter((c) => c.type === "add");
  const noChangeChanges = extendedChanges.filter((c) => c.type === "noChange");

  const groupedChanges = {
    delete: deleteChanges,
    rename: renameChanges,
    renameAndRecolor: renameAndRecolorChanges,
    changeColor: changeColorChanges,
    add: addChanges,
    noChange: noChangeChanges,
  };

  for (const type of F.keys(groupedChanges)) {
    groupedChanges[type].sort((a, b) => (b.inInventory ?? 0) - (a.inInventory ?? 0));
  }

  let description = "";
  for (const type of F.keys(groupedChanges)) {
    if (groupedChanges[type].length === 0) continue;

    const symbol =
      type === "add"
        ? "➕"
        : type === "delete"
          ? "🗑️"
          : type === "rename"
            ? "✏️"
            : type === "renameAndRecolor"
              ? "✏️🎨"
              : type === "changeColor"
                ? "🎨"
                : type === "noChange"
                  ? "✅"
                  : "";

    description += `**${symbol} ${type.toUpperCase()}**\n`;
    for (const change of groupedChanges[type]) {
      if (change.type === "add") {
        description += `${change.name} -> ${change.color.primaryColor}\n`;
      } else if (change.type === "delete") {
        description += `<@&${change.role?.id}> | ${change.inInventory} (${change.withRole})\n`;
      } else if (change.type === "rename") {
        description += `<@&${change.role?.id}> -> ${change.to} | ${change.inInventory} (${change.withRole})\n`;
      } else if (change.type === "renameAndRecolor") {
        description += `<@&${change.role?.id}> -> ${change.to} ${change.colorTo.primaryColor} | ${change.inInventory} (${change.withRole})\n`;
      } else if (change.type === "changeColor") {
        description += `<@&${change.role?.id}> -> ${change.to.primaryColor} | ${change.inInventory} (${change.withRole})\n`;
      } else if (change.type === "noChange") {
        description += `<@&${change.role?.id}> | ${change.inInventory} (${change.withRole})\n`;
      } else {
        throw new Error(`Unhandled change type: ${change satisfies never}`);
      }
    }
    description += "\n";
  }

  const embed = new EmbedBuilder()
    .setTitle("Roles migration checks passed ✅")
    .setDescription(description || "No changes applied.")
    .addFields(
      { name: "Total roles before", value: `${beforeRoleCount}`, inline: true },
      { name: "Total roles after", value: `${rolesAfterChange.size}`, inline: true },
    )
    .setColor("Green");

  await ctx.editReply({ embeds: [embed] });
  return extendedChanges;
}

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  // const { actual } = ctx.opts;

  if (ctx.user.id !== userIDs.me) {
    return await ctx.editReply("You do not have permission to use this command.");
  }

  try {
    const extendedChanges = await calculateRoleChanges(ctx);

    await notifyChange({
      change: { type: "delete", name: "Test Role Deletion" },
      userId: userIDs.me,
      amountRefunded: 1000,
    });

    if (!ctx.opts.actual) return;

    for (const change of extendedChanges) {
      switch (change.type) {
        case "add": {
          addColorRole({ name: change.name, change });
          break;
        }
        case "changeColor": {
          if (!change.role) throw new Error("Role not found for changeColor");
          recolorColorRole({ roleId: change.role.id, change });
          break;
        }
        case "rename": {
          if (!change.role) throw new Error("Role not found for rename");
          renameColorRole({ roleId: change.role.id, change });
          break;
        }
        case "renameAndRecolor": {
          if (!change.role) throw new Error("Role not found for renameAndRecolor");
          renameAndRecolorColorRole({ roleId: change.role.id, change });
          break;
        }
        case "delete": {
          if (!change.role) throw new Error("Role not found for delete");
          deleteColorRole({ roleId: change.role.id, change });
          break;
        }
        case "noChange": {
          break;
        }
        default: {
          throw new Error(`Unhandled change type during migration: ${JSON.stringify(change satisfies never)}`);
        }
      }
    }
  } catch (error) {
    return await ctx.editReply(
      `Error during role migration: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

export default command;
