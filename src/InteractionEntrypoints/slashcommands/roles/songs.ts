import { EmbedBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { channelIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { withCache } from "../../../Helpers/cache";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Chooses up to two song roles that you own",
  options: [
    {
      name: "role1",
      description: "The first role you wish to equip",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
    {
      name: "role2",
      description: "The second role you wish to equip",
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

  for (const id of requestedRoles) {
    if (!roleIDs.includes(id)) {
      throw new CommandError(`You don't own the role <@&${id}> (or it is not a song role)! Visit <#${channelIDs.shop}> to purchase song roles.`);
    }
  }

  const mem = await ctx.member.fetch(true);
  const currentlyEquippedRoles = mem.roles.cache
    .filter((r) => roleIDs.includes(r.id))
    .map((r) => r.id);

  // Remove current roles
  for (const id of currentlyEquippedRoles) {
    await mem.roles.remove(id);
  }

  // Add requested roles
  for (const id of requestedRoles) {
    await mem.roles.add(id);
  }

  const embed = new EmbedBuilder()
    .setTitle("Success! Your song role(s) were replaced with:")
    .setDescription(requestedRoles.map((r) => `<@&${r}>`).join("\n"));

  return ctx.editReply({ embeds: [embed] });
});

export default command;
