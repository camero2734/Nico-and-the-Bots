import { registerTask } from "../absurd";
import type { RoleColorsResolvable } from "discord.js";
import { guild } from "../../../app";
import { channelIDs } from "Configuration/config";
import { prisma } from "Helpers/prisma-init";
import { EmbedBuilder } from "discord.js";

export const deleteColorRole = registerTask(
  "delete-color-role",
  async (params: { roleId: string; color: RoleColorsResolvable }, ctx) => {
    const roleName = await ctx.step("Refund role", async () => {
      const role = await guild.roles.fetch(params.roleId);
      if (!role) {
        throw new Error(`Role with ID ${params.roleId} not found`);
      }

      const users = await prisma.colorRole.findMany({
        where: { roleId: params.roleId },
        select: { userId: true, amountPaid: true },
      });

      for (const user of users) {
        const dm = await guild.members
          .fetch(user.userId)
          .then((m) => m.createDM())
          .catch(console.error);
        if (dm) {
          const embed = new EmbedBuilder()
            .setTitle(`Refund for color role ${role.name}`)
            .setDescription(
              `You are receiving a refund of $${(user.amountPaid / 100).toFixed(
                2,
              )} because the color role **${role.name}** has been deleted. This is the amount you paid for the role.`,
            );

          await dm.send({ embeds: [embed] }).catch(console.error);
        }

        await prisma.$transaction(async (tx) => {
          tx.colorRole.delete({
            where: { roleId_userId: { roleId: params.roleId, userId: user.userId } },
          });
          tx.user.update({
            where: { id: user.userId },
            data: { credits: { increment: user.amountPaid } },
          });
        });
      }
      return role.name;
    });

    await ctx.step("Deleting role", async () => {
      // Validate that nobody owns the role anymore
      const count = await prisma.colorRole.count({
        where: { roleId: params.roleId },
      });
      if (count > 0) {
        throw new Error(`Cannot delete role ${roleName} (${params.roleId}) because it is still owned by users`);
      }

      await guild.roles.delete(params.roleId, "Color role deleted during migration");
    });

    await ctx.step("Finished", async () => {
      const testChannel = await guild.channels.fetch(channelIDs.bottest);
      if (!testChannel || !testChannel.isTextBased()) return false;
      await testChannel.send(
        `Deleted color role ${roleName} (${params.roleId}) with color ${params.color.primaryColor}`,
      );
      return true;
    });
  },
);
