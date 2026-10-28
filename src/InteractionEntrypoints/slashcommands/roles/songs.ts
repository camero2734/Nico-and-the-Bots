import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { EmbedBuilder } from "@discordjs/builders";
import { CommandError } from "../../../Configuration/definitions";
import { withCache } from "../../../Helpers/cache";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Chooses up to two song roles that you own",
  options: [
    {
      name: "role1",
      description: "The first role you wish to equip/unequip",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
    {
      name: "role2",
      description: "The second role you wish to equip/unequip",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
  ],
});

command.setHandler(async (ctx) => {
  const role1 = ctx.opts.role1;
  const role2 = ctx.opts.role2;

  await ctx.deferReply({ flags: MessageFlags.Ephemeral });

  const userRoles = await prisma.songRole.findMany({
    where: { userId: ctx.user.id },
  });

  const orderedRoleIds = await withCache(
    "songs-role-id-cache",
    async () => {
      const roles = await ctx.guild.roles.fetch();
      return roles.sort((a, b) => a.position - b.position).map((r) => r.id);
    },
    3600,
  );

  const roleIDs = userRoles
    .map((r) => r.roleId)
    .sort((a, b) => {
      return orderedRoleIds.indexOf(b) - orderedRoleIds.indexOf(a);
    });

  if (!roleIDs || roleIDs.length === 0) {
    throw new CommandError(`You don't have any song roles!`);
  }

  if (!role1 && !role2) {
    const embed = new EmbedBuilder()
      .setTitle("Your Song Roles")
      .setDescription(roleIDs.map((r) => `<@&${r}>`).join("\n"))
      .addFields([
        {
          name: "How do I choose a song role?",
          value: `You can equip up to two song roles that you own by mentioning the roles in the optional parameters of this command. For example, you can say:\n\n/roles songs <@&${roleIDs[0]}>`,
        },
      ]);

    return ctx.editReply({ embeds: [embed] });
  }

  // Confirms if the roles informed belong to the user
  const requestedRoles = [role1, role2].filter(Boolean) as string[];

  for (const rId of requestedRoles) {
    if (!roleIDs.includes(rId)) {
      throw new CommandError(`You don't own the role <@&${rId}> (or it is not a song role)!`);
    }
  }

  const actionsTaken: string[] = [];

  // Verifies each role individually (removes if the user already has it, adds if they don't)
  for (const rId of requestedRoles) {
    const hasRole = ctx.member.roles.cache.has(rId);

    if (hasRole) {
      await ctx.member.roles.remove(rId);
      actionsTaken.push(`The <@&${rId}> role was removed from your roles.`);
    } else {
      await ctx.member.roles.add(rId);
      actionsTaken.push(`The <@&${rId}> role was added to your roles.`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("Success!")
    .setDescription(actionsTaken.join("\n"));

  return ctx.editReply({ embeds: [embed] });
});

export default command;
