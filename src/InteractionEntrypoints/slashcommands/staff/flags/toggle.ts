import { EmbedBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { FEATURE_FLAGS } from "../../../../Helpers/feature-flags";

const command = new SlashCommand({
  description: "Toggle a feature flag",
  options: [
    {
      name: "flag",
      description: "The flag to toggle",
      required: true,
      type: ApplicationCommandOptionType.String,
      choices: Object.values(FEATURE_FLAGS).map((flag) => ({ name: flag, value: flag })),
    },
    {
      name: "value",
      description: "The value to set the flag to. If not provided, the current value will be returned",
      required: false,
      type: ApplicationCommandOptionType.Boolean,
    }
  ],
});

command.setHandler(async (ctx) => {
  const { value, flag: flagName } = ctx.opts;
  await ctx.deferReply();

  const flag = await prisma.featureFlag.findUnique({
    where: { name: flagName },
  });

  if (value === undefined) {
    const embed = new EmbedBuilder().setDescription(`**${flagName}** is currently ${flag?.enabled ? "enabled" : "disabled"}.`);
    await ctx.editReply({ embeds: [embed] });
    return;
  }

  await prisma.featureFlag.upsert({
    where: { name: flagName },
    create: { name: flagName, enabled: value },
    update: { enabled: value },
  });

  const embed = new EmbedBuilder().setDescription(`**${flagName}** is now ${value ? "enabled" : "disabled"}.`);

  await ctx.editReply({ embeds: [embed] });
});

export default command;
