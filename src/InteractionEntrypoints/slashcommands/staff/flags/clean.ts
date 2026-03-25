import { EmbedBuilder } from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { userIDs } from "../../../../Configuration/config";
import { CommandError } from "../../../../Configuration/definitions";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { FEATURE_FLAGS, FlagName } from "../../../../Helpers/feature-flags";

const command = new SlashCommand({
  description: "Clean up old flags",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply({ flags: MessageFlags.Ephemeral });

  if (ctx.user.id !== userIDs.me) {
    throw new CommandError("Only the bot owner can run this command.");
  }

  const validFlagNames = new Set(Object.values(FEATURE_FLAGS));
  const dbFlags = await prisma.featureFlag.findMany();

  const orphanedFlags = dbFlags.filter(
    (f) => !validFlagNames.has(f.name as FlagName),
  );

  if (orphanedFlags.length === 0) {
    const embed = new EmbedBuilder().setDescription("No orphaned flags found.");
    await ctx.editReply({ embeds: [embed] });
    return;
  }

  await prisma.featureFlag.deleteMany({
    where: {
      name: { in: orphanedFlags.map((f) => f.name) },
    },
  });

  const embed = new EmbedBuilder().setDescription(
    `Deleted ${orphanedFlags.length} orphaned flag(s): ${orphanedFlags.map((f) => f.name).join(", ")}`,
  );
  await ctx.editReply({ embeds: [embed] });
});

export default command;
