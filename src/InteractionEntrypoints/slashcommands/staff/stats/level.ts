import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { LevelCalculator } from "Helpers";

const command = new SlashCommand({
  description: "Check how many users attained a certain level",
  options: [
    {
      name: "level",
      description: "The level to check",
      required: true,
      type: ApplicationCommandOptionType.Integer,
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const { level } = ctx.opts;

  const equivalentScore = LevelCalculator.calculateScore(level);
  const count = await prisma.user.count({
    where: {
      score: {
        gte: equivalentScore,
      },
    },
  });

  const embed = new EmbedBuilder()
    .setTitle(`Users at level ${level} or higher`)
    .setDescription(`There are **${count}** users at level ${level} or higher.`);

  await ctx.editReply({ embeds: [embed] });
});

export default command;
