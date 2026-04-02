import { channelIDs } from "Configuration/config";
import { prisma } from "Helpers/prisma-init";
import type { Change } from "InteractionEntrypoints/slashcommands/superstaff/migratecolorroles/_consts";
import { guild } from "../../Altbots/nico";
import { registerTask } from "../absurd";
import { notifyChange } from "./notify";

export const renameColorRole = registerTask(
  "rename-color-role",
  async (params: { roleId: string; change: Extract<Change, { type: "rename" }> }, ctx) => {
    await ctx.step("Renaming role", async () => {
      const role = await guild.roles.fetch(params.roleId);
      if (!role) {
        throw new Error(`Role with ID ${params.roleId} not found`);
      }

      await role.setName(params.change.to, "Renaming color role");
    });

    const userCount = await ctx.step("Notify users role renamed", async () => {
      const role = await guild.roles.fetch(params.roleId);
      if (!role) {
        throw new Error(`Role with ID ${params.roleId} not found`);
      }

      const users = await prisma.colorRole.findMany({
        where: { roleId: params.roleId },
        select: { userId: true, amountPaid: true },
      });

      for (const user of users) {
        await notifyChange({
          userId: user.userId,
          roleId: params.roleId,
          change: params.change,
        });
      }

      return users.length;
    });

    await ctx.step("Finished renaming", async () => {
      const bottest = await guild.channels.fetch(channelIDs.bottest);
      if (!bottest || !bottest.isTextBased()) throw new Error("Bottest channel not found");

      await bottest.send({
        content: `Renamed color role <@&${params.roleId}> for ${userCount} users.`,
        allowedMentions: { parse: [] },
      });
    });
  },
);
