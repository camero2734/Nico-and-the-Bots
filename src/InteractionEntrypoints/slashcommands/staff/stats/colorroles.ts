import { EmbedBuilder } from "discord.js";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { roles } from "../../../../Configuration/config";

const command = new SlashCommand({
  description: "Check how many active (still in server) users own a certain color role",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const colorRoles: Array<{ count: number; name: string }> = [];
  for (const tier of Object.values(roles.colors)) {
    for (const roleId of Object.values(tier)) {
      const role = await ctx.guild?.roles.fetch(roleId);
      if (!role) continue;

      const count = await prisma.user.count({
        where: {
          colorRoles: {
            some: { roleId: role.id },
          },
          currentlyInServer: true,
        },
      });

      colorRoles.push({ count, name: role.name });
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("Color Role Ownership Stats")
    .setDescription(colorRoles.map((r) => `**${r.name}**: ${r.count} active user(s)`).join("\n"))
    .setColor("Random")
    .setTimestamp();

  await ctx.editReply({ embeds: [embed] });
});

export default command;
