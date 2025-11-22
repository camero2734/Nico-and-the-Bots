import { registerTask } from "../absurd";
import { guild } from "../../../app";
import { channelIDs } from "Configuration/config";
import type { Change } from "InteractionEntrypoints/slashcommands/superstaff/migratecolorroles/_consts";

export const addColorRole = registerTask(
  "add-color-role",
  async (params: { name: string; change: Extract<Change, { type: "add" }> }, ctx) => {
    await ctx.step("Creating role", async () => {
      await guild.roles.create({
        name: params.name,
        colors: params.change.color,
        reason: "Color role migration",
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
