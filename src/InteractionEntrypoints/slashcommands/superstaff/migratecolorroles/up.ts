import type { Snowflake } from "discord.js";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { type Change, changes } from "./_consts";

const command = new SlashCommand({
  description: "Makes changes",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();
  for (const [roleId, change] of Object.entries(changes) as [Snowflake, Change][]) {
    const role = await ctx.guild.roles.fetch(roleId);
    if (!role) continue;

    await role.edit({ color: change.to });
  }
  await ctx.editReply("Done");
});

export default command;
