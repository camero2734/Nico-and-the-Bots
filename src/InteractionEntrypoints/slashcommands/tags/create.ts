import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const TAG_COST = 1000;

const command = new SlashCommand({
  description: "Creates (or edits) a command that sends a short snippet of text",
  options: [
    {
      name: "name",
      description: "The name of the tag",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "text",
      description: "The text that gets sent with the tag",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply({ ephemeral: true });

  const existingTag = await prisma.tag.findUnique({
    where: { name: ctx.opts.name },
  });

  if (existingTag?.userId) {
    if (existingTag.userId.toSnowflake() !== ctx.user.id) throw new CommandError("This tag already exists");
    existingTag.text = ctx.opts.text;

    await prisma.tag.update({
      where: { name: existingTag.name },
      data: { text: ctx.opts.text },
    });

    const embed = new EmbedBuilder()
      .setTitle(`Your tag \`${ctx.opts.name}\` was successfully edited`)
      .setDescription(ctx.opts.text);
    await ctx.send({ embeds: [embed.toJSON()] });
    return;
  }

  const textLookup = await prisma.temporaryText.create({
    data: { value: ctx.opts.text },
  });

  const embed = new EmbedBuilder()
    .setTitle(`Create tag \`${ctx.opts.name}\`? [${TAG_COST} credits]`)
    .setDescription(ctx.opts.text)
    .setFooter({ text: "Select yes or no" });

  const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setLabel("Yes")
      .setStyle(ButtonStyle.Success)
      .setCustomId(generateYesID({ name: ctx.opts.name, textLookup: `${textLookup.id}` })),
  ]);

  await ctx.send({ embeds: [embed], components: [actionRow] });
});

const generateYesID = command.addInteractionListener("tcYes", ["name", "textLookup"], async (ctx, args) => {
  await ctx.deferReply({ ephemeral: true });

  const { value: text, id } =
    (await prisma.temporaryText.findUnique({
      where: { id: +args.textLookup },
    })) || {};
  if (!text) return;

  const userCredits = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { score: true },
  });
  if (!userCredits || userCredits.score < TAG_COST) throw new CommandError("You don't have enough credits!");

  const [createdTag] = await prisma.$transaction([
    prisma.tag.create({
      data: { text, userId: ctx.user.id, name: args.name },
    }),
    prisma.user.update({
      where: { id: ctx.user.id },
      data: { credits: { decrement: TAG_COST } },
    }),
    prisma.temporaryText.delete({ where: { id } }),
  ]);

  const doneEmbed = new EmbedBuilder()
    .setTitle(`Tag created: \`${args.name}\``)
    .setDescription(text)
    .addFields([
      {
        name: "Usage",
        value: `Use this tag with the command \`/tags use ${createdTag.name}\``,
      },
    ]);

  await ctx.editReply({ embeds: [doneEmbed], components: [] });
});

export default command;
