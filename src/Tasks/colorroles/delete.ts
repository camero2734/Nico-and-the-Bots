import { channelIDs } from "Configuration/config";
import { prisma } from "Helpers/prisma-init";
import type { Change } from "InteractionEntrypoints/slashcommands/superstaff/migratecolorroles/_consts";
import { guild } from "../../../app";
import { registerTask } from "../absurd";
import { notifyChange } from "./notify";

export const deleteColorRole = registerTask(
  "delete-color-role",
  async (params: { roleId: string; change: Extract<Change, { type: "delete" }> }, ctx) => {
    await ctx.step("Notify users", async () => {
      const users = await prisma.colorRole.findMany({
        where: { roleId: params.roleId },
        select: { userId: true, amountPaid: true },
      });

      const role = await guild.roles.fetch(params.roleId);
      if (!role) throw new Error(`Role with ID ${params.roleId} not found`);

      for (const user of users) {
        await notifyChange({
          change: params.change,
          userId: user.userId,
          roleId: params.roleId,
          amountRefunded: user.amountPaid,
        });
      }
    });

    await ctx.step("Refund users", async () => {
      // await prisma.$transaction(async (tx) => {
      //   const rolesToRefund = await tx.colorRole.findMany({
      //     where: { roleId: params.roleId },
      //     select: { userId: true, amountPaid: true },
      //   });

      //   for (const roleEntry of rolesToRefund) {
      //     await tx.user.update({
      //       where: { id: roleEntry.userId },
      //       data: { credits: { increment: roleEntry.amountPaid } },
      //     });

      //     await tx.colorRole.delete({
      //       where: { roleId_userId: { roleId: params.roleId, userId: roleEntry.userId } },
      //     });
      //   }
      // });
      console.log(`Would refund users for role ID ${params.roleId}`);
    });

    const roleColors = await ctx.step("Deleting role", async () => {
      // Validate that nobody owns the role anymore
      // const count = await prisma.colorRole.count({
      //   where: { roleId: params.roleId },
      // });
      // if (count > 0) {
      //   throw new Error(
      //     `Cannot delete role ${params.change.name} (${params.roleId}) because it is still owned by ${count} user(s)`,
      //   );
      // }

      const role = await guild.roles.fetch(params.roleId);
      if (!role) {
        throw new Error(`Role with ID ${params.roleId} not found`);
      }

      // await role.delete("Color role deleted during migration");

      return {
        primaryColor: Bun.color(role.colors.primaryColor, "hex"),
        secondaryColor: role.colors.secondaryColor ? Bun.color(role.colors.secondaryColor, "hex") : null,
        tertiaryColor: role.colors.tertiaryColor ? Bun.color(role.colors.tertiaryColor, "hex") : null,
      };
    });

    await ctx.step("Finished", async () => {
      const testChannel = await guild.channels.fetch(channelIDs.bottest);
      if (!testChannel || !testChannel.isTextBased()) return false;
      await testChannel.send(
        `Deleted color role ${params.change.name} (${params.roleId}) with color ${roleColors.primaryColor}`,
      );
      return true;
    });
  },
);
