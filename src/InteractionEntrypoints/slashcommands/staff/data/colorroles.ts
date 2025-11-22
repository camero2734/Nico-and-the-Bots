import { AttachmentBuilder, type RoleColors } from "discord.js";
import { roles } from "../../../../Configuration/config";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Dumps current color role data",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const colorRoles = Object.values(roles.colors).flatMap((x) => Object.values(x));
  const data: { name: string; colors: RoleColors | undefined }[] = [];
  for (const roleId of colorRoles) {
    const role = ctx.guild.roles.cache.get(roleId);
    if (!role) throw new Error(`Role with ID ${roleId} not found in guild`);
    data.push({
      name: role.name,
      colors: role.colors || undefined,
    });
  }

  const file = new AttachmentBuilder(Buffer.from(JSON.stringify(data, null, 2), "utf-8"), {
    name: "colorroles.json",
    description: "Current color role data",
  });

  await ctx.editReply({
    content: "Attached is the current color role data.",
    files: [file],
  });
});

export default command;
