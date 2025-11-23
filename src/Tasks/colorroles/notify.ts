import { channelIDs } from "Configuration/config";
import { prisma } from "Helpers/prisma-init";
import type { Change } from "InteractionEntrypoints/slashcommands/superstaff/migratecolorroles/_consts";
import { EmbedBuilder } from "discord.js";
import { guild } from "../../../app";
import { registerTask } from "../absurd";

type NotifiableChange = Exclude<Change, { type: "add" | "noChange" }>;

export const notifyChange = registerTask(
  "notify-color-role-change",
  async (params: { change: NotifiableChange; userId: string; roleId?: string; amountRefunded?: number }, ctx) => {
    await ctx.step("Notifying user", async () => {
      const dm = await guild.members.fetch(params.userId).then((m) => m.createDM());

      const role = await guild.roles.fetch(params.roleId || "").catch(() => null);
      const userRole = params.roleId
        ? await prisma.colorRole.findUnique({
            where: { roleId_userId: { roleId: params.roleId, userId: params.userId } },
            select: { amountPaid: true },
          })
        : null;

      const embed = new EmbedBuilder();
      switch (params.change.type) {
        case "changeColor": {
          if (!role) throw new Error("Unable to find role");
          if (!userRole) throw new Error("Did not find in user's inventory");

          embed
            .setTitle(`Color role ${role.name} recolored`)
            .setColor(role.colors.primaryColor)
            .setDescription(
              `The color role **${role.name}** has been slightly recolored. The role is still available in your inventory, and you can continue to use it as before.\n\nView <#${channelIDs.shop}> to browse our new available color roles!`,
            )
            .addFields({
              name: "Refund Possible",
              value: `If you are unhappy with the new color, you can request a refund within 30 days for the original credits you paid (${userRole.amountPaid} credits). You can do this by using the \`/roles refund\` command in <#${channelIDs.commands}>.`,
            });

          break;
        }
        case "delete": {
          embed
            .setTitle(`Color role ${params.change.name} deleted`)
            .setColor("Red")
            .setDescription(
              `The color role **${params.change.name}** has been deleted and is no longer available in your inventory.\n\nView <#${channelIDs.shop}> to browse our new available color roles!`,
            )
            .addFields({
              name: "Refund",
              value: `You should have received a refund of ${params.amountRefunded} credits, the amount you originally paid for the role.`,
            });

          break;
        }
        case "rename": {
          if (!role) throw new Error("Unable to find role");
          if (!userRole) throw new Error("Did not find in user's inventory");

          embed
            .setTitle(`Color role ${params.change.from} renamed`)
            .setColor(role.colors.primaryColor)
            .setDescription(
              `The color role **${params.change.from}** has been renamed to **${params.change.to}**. The color **did not change**. The role is still available in your inventory, and you can continue to use it as before.\n\nView <#${channelIDs.shop}> to browse our new available color roles!`,
            );

          break;
        }
        case "renameAndRecolor": {
          if (!role) throw new Error("Unable to find role");
          if (!userRole) throw new Error("Did not find in user's inventory");

          embed
            .setTitle(`Color role ${params.change.from} renamed and recolored`)
            .setColor(role.colors.primaryColor)
            .setDescription(
              `The color role **${params.change.from}** has been renamed to **${params.change.to}** and **the color was slightly modified**. The role is still available in your inventory, and you can continue to use it as before.\n\nView <#${channelIDs.shop}> to browse our new available color roles!`,
            )
            .addFields({
              name: "Refund Possible",
              value: `If you are unhappy with the new color, you can request a refund within 30 days for the original credits you paid (${userRole.amountPaid} credits). You can do this by using the \`/roles refund\` command in <#${channelIDs.commands}>.`,
            });

          break;
        }
        default: {
          throw new Error(`Unknown change type ${params.change satisfies never}`);
        }
      }

      await dm.send({ embeds: [embed] });
      return "Notified user";
    });
  },
);
