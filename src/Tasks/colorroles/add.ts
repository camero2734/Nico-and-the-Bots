import { channelIDs } from "Configuration/config";
import type { Change } from "InteractionEntrypoints/slashcommands/superstaff/migratecolorroles/_consts";
import { guild } from "../../../app";
import { registerTask } from "../absurd";

export const addColorRole = registerTask(
  "add-color-role",
  async (params: { name: string; change: Extract<Change, { type: "add" }> }, ctx) => {
    await ctx.step("Creating role", async () => {
      // The new role will be placed just below the reference role
      const referenceRole = await guild.roles.fetch("850786456967970837");
      if (!referenceRole) {
        throw new Error("Reference role not found");
      }

      await guild.roles.create({
        name: params.name,
        colors: params.change.color,
        reason: "Color role migration",
        position: referenceRole.position - 1,
      });
    });

    await ctx.step("Finished", async () => {
      const testChannel = await guild.channels.fetch(channelIDs.bottest);
      if (!testChannel || !testChannel.isTextBased()) return false;
      await testChannel.send(`Created color role ${params.name} with color ${JSON.stringify(params.change.color)}`);
      return true;
    });
  },
);
