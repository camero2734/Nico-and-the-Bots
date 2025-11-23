import { channelIDs } from "Configuration/config";
import { prisma } from "Helpers/prisma-init";
import type { Change } from "InteractionEntrypoints/slashcommands/superstaff/migratecolorroles/_consts";
import { guild } from "../../../app";
import { registerTask } from "../absurd";
import { notifyChange } from "./notify";

export const recolorColorRole = registerTask(
  "recolor-color-role",
  async (params: { roleId: string; change: Extract<Change, { type: "changeColor" }> }, ctx) => {
    await ctx.step("Recoloring role", async () => {
      const role = await guild.roles.fetch(params.roleId);
      if (!role) {
        throw new Error(`Role with ID ${params.roleId} not found`);
      }

      // await role.setColors(params.change.to, "Recoloring color role");
      console.log(`Would recolor role ${role.name} (${params.roleId}) to ${JSON.stringify(params.change.to)}`);
    });

    const userCount = await ctx.step("Notify users role recolored", async () => {
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

    await ctx.step("Finished recoloring", async () => {
      const bottest = await guild.channels.fetch(channelIDs.bottest);
      if (!bottest || !bottest.isTextBased()) throw new Error("Bottest channel not found");

      await bottest.send({
        content: `Recolored color role <@&${params.roleId}> for ${userCount} users.`,
        allowedMentions: { parse: [] },
      });
    });
  },
);
