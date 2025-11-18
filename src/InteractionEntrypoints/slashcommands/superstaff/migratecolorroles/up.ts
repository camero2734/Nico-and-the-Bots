import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { changes } from "./_consts";
import { roles, userIDs } from "Configuration/config";
import { ApplicationCommandOptionType } from "discord.js";
import { EmbedBuilder } from "discord.js";

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
    existingRoles.add(role.name.toLowerCase());
    rolesAfterChange.add(role.name.toLowerCase());
  }

  for (const change of changes) {
    switch (change.type) {
      case "add": {
        // const role = await ctx.guild.roles.create({
        //   name: change.name,
        //   color: change.color,
        //   reason: "Migrating color roles",
        // });
        rolesAfterChange.add(change.name.toLowerCase());
        break;
      }
      case "delete": {
        const role = ctx.guild.roles.cache.find((r) => r.name.toLowerCase() === change.name.toLowerCase());
        if (!role) throw new Error(`Role to delete not found: ${change.name}`);

        existingRoles.delete(change.name.toLowerCase());
        rolesAfterChange.delete(change.name.toLowerCase());
        // if (role) {
        //   await role.delete("Migrating color roles");
        // }
        break;
      }
      case "changeColor": {
        const role = ctx.guild.roles.cache.find((r) => r.name.toLowerCase() === change.name.toLowerCase());
        if (!role) throw new Error(`Role to change color not found: ${change.name}`);
        existingRoles.delete(change.name.toLowerCase());
        // if (role) {
        //   await role.setColor(change.to, "Migrating color roles");
        // }
        break;
      }
      case "rename": {
        const role = ctx.guild.roles.cache.find((r) => r.name.toLowerCase() === change.from.toLowerCase());
        if (!role) throw new Error(`Role to rename not found: ${change.from}`);

        if (role.hexColor.toLowerCase() !== (change.expectedColor.primaryColor as string).toLowerCase()) {
          throw new Error(
            `Role color mismatch for ${change.from}: expected ${change.expectedColor.primaryColor}, got ${role.hexColor}`,
          );
        }

        rolesAfterChange.delete(change.from.toLowerCase());
        rolesAfterChange.add(change.to.toLowerCase());
        existingRoles.delete(change.from.toLowerCase());
        // if (role) {
        //   await role.setName(change.to, "Migrating color roles");
        // }
        break;
      }
      case "changeAndRename": {
        const role = ctx.guild.roles.cache.find((r) => r.name.toLowerCase() === change.from.toLowerCase());
        if (!role) throw new Error(`Role to change and rename not found: ${change.from}`);
        rolesAfterChange.delete(change.from.toLowerCase());
        rolesAfterChange.add(change.to.toLowerCase());
        existingRoles.delete(change.from.toLowerCase());
        // if (role) {
        //   await role.setName(change.to, "Migrating color roles");
        //   await role.setColors(change.colorTo, "Migrating color roles");
        // }
        break;
      }
      case "noChange": {
        const role = ctx.guild.roles.cache.find((r) => r.name.toLowerCase() === change.name.toLowerCase());

        const data = {
          availableRoles: ctx.guild.roles.cache.map((r) => r.name),
          targetRole: change.name,
        };
        await Bun.file("role-migration-debug.txt").write(JSON.stringify(data, null, 2));

        if (!role) {
          throw new Error(`Role for noChange not found: ${change.name}`);
        }
        if (role.hexColor.toLowerCase() !== (change.expectedColor.primaryColor as string).toLowerCase()) {
          throw new Error(
            `Role color mismatch for ${change.name}: expected ${change.expectedColor.primaryColor}, got ${role.hexColor}`,
          );
        }

        existingRoles.delete(change.name.toLowerCase());

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
