import { registerTask } from "../absurd";
import type { RoleColorsResolvable } from "discord.js";
import { guild } from "../../../app";
import { channelIDs } from "Configuration/config";

export const addColorRole = registerTask(
  "add-color-role",
  async (params: { name: string; color: RoleColorsResolvable }, ctx) => {
    await ctx.step("Creating role", async () => {
      await guild.roles.create({
        name: params.name,
        colors: params.color,
        reason: "Color role migration",
      });
    });

    await ctx.step("Finished", async () => {
      const testChannel = await guild.channels.fetch(channelIDs.bottest);
      if (!testChannel || !testChannel.isTextBased()) return false;
      await testChannel.send(`Created color role ${params.name} with color ${JSON.stringify(params.color)}`);
      return true;
    });
  },
);
