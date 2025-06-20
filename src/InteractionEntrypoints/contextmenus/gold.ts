import Cron from "croner";
import { addDays } from "date-fns";
import { ButtonStyle } from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  type Message,
  type Snowflake,
  type TextChannel,
} from "discord.js";
import { guild } from "../../../app";
import { channelIDs, emojiIDs, roles } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { type ContextMenu, MessageContextMenu } from "../../Structures/EntrypointContextMenu";
import { TimedInteractionListener } from "../../Structures/TimedInteractionListener";

const GOLD_COST = 2500;
const ADDITIONAL_GOLD_COST = 1000;
export const NUM_GOLDS_FOR_CERTIFICATION = 3;
export const NUM_DAYS_FOR_CERTIFICATION = 1;
const NOT_CERTIFIED_FIELD = "⚠️ Not certified!";

const MESSAGE_ALREADY_GOLD = `This message has already been given gold! You can give it an additional gold by pressing the button on the post in <#${channelIDs.houseofgold}>.`;

const ctxMenu = new MessageContextMenu("🪙 Gold Message");

ctxMenu.setHandler(async (ctx, msg) => {
  if (!msg.member || !msg.inGuild()) throw new Error("Could not find member");

  await ctx.deferReply({ ephemeral: true });

  // Ensure the message hasn't already been golded
  const givenGold = await prisma.gold.findFirst({
    where: { messageId: msg.id },
  });
  if (givenGold) {
    if (!givenGold.houseOfGoldMessageUrl) {
      throw new CommandError(
        `This message has already been given gold. It did not receive the required ${NUM_GOLDS_FOR_CERTIFICATION} golds, so it was deleted. It is not eligible to be golded again.`,
      );
    }

    const embed = new EmbedBuilder().setDescription(MESSAGE_ALREADY_GOLD);
    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
      new ButtonBuilder().setLabel("View post").setStyle(ButtonStyle.Link).setURL(givenGold.houseOfGoldMessageUrl),
    ]);

    return ctx.editReply({ embeds: [embed], components: [actionRow] });
  }

  await handleGold(ctx, msg, msg.id, msg.channel.id);
});

const genAdditionalGoldId = ctxMenu.addInteractionListener(
  "additionalGold",
  ["originalUserId", "originalMessageId", "originalChannelId"],
  async (ctx, args) => {
    if (!ctx.message.inGuild()) return;

    await ctx.deferReply({ ephemeral: true });
    await handleGold(
      (<unknown>ctx) as typeof ContextMenu.GenericContextType,
      ctx.message,
      args.originalMessageId,
      args.originalChannelId,
      args.originalUserId,
    );
  },
);

async function handleGold(
  ctx: typeof ContextMenu.GenericContextType,
  msg: Message<true>,
  originalMessageId: Snowflake,
  originalChannelId: Snowflake,
  originalUserId?: Snowflake,
) {
  if (!msg.member || !ctx.member?.user) return;

  const isAdditionalGold = !!originalUserId;
  const cost = isAdditionalGold ? ADDITIONAL_GOLD_COST : GOLD_COST;

  const ctxMember = await ctx.guild?.members.fetch(ctx.member.user.id);
  if (!ctxMember) throw new Error("Could not find member");

  const originalMember = isAdditionalGold ? await ctxMember.guild?.members.fetch(originalUserId) : msg.member;
  const originalMessageUrl = `https://discord.com/channels/${ctx.guild?.id}/${originalChannelId}/${originalMessageId}`;

  // Check that the user can give gold
  if (originalMember.id === ctx.user.id) throw new CommandError("You cannot give gold to yourself");

  const previousGold = await prisma.gold.findFirst({
    where: { houseOfGoldMessageUrl: msg.url, fromUserId: ctx.user.id },
  });
  if (previousGold) throw new CommandError("You already gave this message gold!");

  const goldBaseEmbed = isAdditionalGold
    ? EmbedBuilder.from(msg.embeds[0])
    : new EmbedBuilder()
        .setAuthor({
          name: originalMember.displayName,
          iconURL: originalMember.user.displayAvatarURL(),
        })
        .setColor(0xfce300)
        .addFields([{ name: "Channel", value: `${msg.channel}`, inline: true }])
        .addFields([
          {
            name: "Posted",
            value: F.discordTimestamp(new Date(), "shortDateTime"),
            inline: true,
          },
        ])
        .addFields([{ name: "Message", value: msg.content || "*No content*" }])
        .setFooter({
          text: `Given by ${ctxMember.displayName}.`,
          iconURL: ctx.user.displayAvatarURL(),
        });

  if (!isAdditionalGold && msg.attachments.size > 0) {
    const url = msg.attachments.first()?.url;
    if (url) goldBaseEmbed.setImage(url);
  }

  let askEmbed = EmbedBuilder.from(goldBaseEmbed).addFields([
    {
      name: "\u200b",
      value: "**Would you like to give gold to this message?**",
    },
  ]);
  if (isAdditionalGold) {
    askEmbed = new EmbedBuilder()
      .setAuthor({
        name: originalMember.displayName,
        iconURL: originalMember.user.displayAvatarURL(),
      })
      .setColor(0xfce300)
      .setDescription("Would you like to add another gold to this message?");
  }

  const timedListener = new TimedInteractionListener(ctx, <const>["goldCtxYes", "goldCtxNo"]);
  const [yesId, noId] = timedListener.customIDs;

  const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setLabel(`Yes (${cost} credits)`)
      .setEmoji({ id: emojiIDs.gold })
      .setStyle(ButtonStyle.Primary)
      .setCustomId(yesId),
    new ButtonBuilder().setLabel("No").setStyle(ButtonStyle.Secondary).setCustomId(noId),
  ]);

  await ctx.editReply({
    embeds: [askEmbed],
    components: [actionRow],
    // ephemeral: true
  });

  const [buttonPressed, btx] = await timedListener.wait();

  if (btx) btx.deferUpdate();

  if (buttonPressed !== yesId) {
    throw new CommandError(
      "You chose not to give gold. That's okay, sometimes we make decisions that don't work out and that's 100% valid. If you want to give gold again in the future, don't hesitate to reclick that context menu button to share your appreciation of that person's post. They would probably appreciate it a lot. Please give me your credits.",
    );
  }

  const chan = (await msg.guild?.channels.fetch(channelIDs.houseofgold)) as TextChannel;
  if (!chan) throw new Error("Couldn't find the gold channel");

  const numGolds = 1 + (isAdditionalGold ? await prisma.gold.count({ where: { houseOfGoldMessageUrl: msg.url } }) : 0);
  const goldsUntilCertified = NUM_GOLDS_FOR_CERTIFICATION - numGolds;

  const goldActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setLabel(`${numGolds} Gold${F.plural(numGolds)}`)
      .setEmoji({ id: emojiIDs.gold })
      .setStyle(ButtonStyle.Primary)
      .setCustomId(
        genAdditionalGoldId({
          originalUserId: originalUserId ?? msg.author.id,
          originalMessageId,
          originalChannelId,
        }),
      ),
    new ButtonBuilder().setLabel("View message").setStyle(ButtonStyle.Link).setURL(originalMessageUrl),
  ]);

  const goldEmbed = EmbedBuilder.from(goldBaseEmbed);
  const idx = goldEmbed.data.fields?.findIndex((f) => f.name === NOT_CERTIFIED_FIELD) || -1;
  if (idx !== -1) goldEmbed.spliceFields(idx, 1);

  if (goldsUntilCertified > 0) {
    const date = isAdditionalGold ? msg.createdAt : new Date();

    goldEmbed.addFields([
      {
        name: "⚠️ Not certified!",
        value: `This post needs ${goldsUntilCertified} more gold${F.plural(goldsUntilCertified)}, or it will be deleted ${F.discordTimestamp(
          addDays(date, NUM_DAYS_FOR_CERTIFICATION),
          "relative",
        )}`,
      },
    ]);
  }

  const goldMessage = await prisma.$transaction(
    async (tx) => {
      if (!isAdditionalGold) {
        const previousGold = await prisma.gold.findFirst({
          where: { messageId: originalMessageId },
        });
        if (previousGold) throw new CommandError(MESSAGE_ALREADY_GOLD);
      }

      const user = await tx.user.update({
        where: { id: ctx.user.id },
        data: { credits: { decrement: cost } },
      });
      if (user.credits < 0) throw new CommandError("You don't have enough credits!");

      const payload = { embeds: [goldEmbed], components: [goldActionRow] };
      const m = isAdditionalGold ? await msg.edit(payload) : await chan.send(payload);

      await tx.gold.create({
        data: {
          messageId: originalMessageId,
          channelId: m.channel.id,
          fromUserId: ctx.user.id,
          toUserId: originalMember.id,
          houseOfGoldMessageUrl: m.url,
        },
      });

      return m;
    },
    { timeout: 15000, maxWait: 15000 },
  );

  const replyEmbed = new EmbedBuilder().setDescription("Gold successfully given");

  const replyActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder().setLabel("View post").setStyle(ButtonStyle.Link).setURL(goldMessage.url),
  ]);

  await ctx.editReply({
    embeds: [replyEmbed],
    components: isAdditionalGold ? [] : [replyActionRow],
  });

  // React to original message with gold emoji
  await msg.react(emojiIDs.gold);

  // Add gold role
  if (goldsUntilCertified <= 0) {
    await originalMember.roles.add(roles.gold);
  }

  // Send message to golded user
  const dm = await originalMember.createDM();
  const dmEmbed = new EmbedBuilder()
    .setDescription(
      `You received gold from ${ctxMember.displayName}!${goldsUntilCertified === 0 ? " Your post has also now passed the threshold to stay in the gold channel, and **you have received the gold role.**" : ""}`,
    )
    .setColor(0xfce300)
    .setFooter({
      text: `Given in ${msg.channel.name}`,
      iconURL: ctx.guild?.iconURL() || undefined,
    });

  await dm.send({ embeds: [dmEmbed], components: [replyActionRow] });
}

export default ctxMenu;

// Remove gold role from users that haven't received golds in the last 3 days
new Cron("12 * * * *", async () => {
  if (!guild) return;
  const goldRole = await guild.roles.fetch(roles.gold);
  if (!goldRole) return;

  const usersWithGoldRole = goldRole.members;

  const receivedGoldRecently = await prisma.gold.findMany({
    where: {
      toUserId: { in: usersWithGoldRole.map((u) => u.id) },
      createdAt: { gte: addDays(new Date(), -3) },
    },
  });

  const hasGoldRoleSet = new Set(usersWithGoldRole.map((u) => u.id));
  const receivedGoldRecentlySet = new Set(receivedGoldRecently.map((g) => g.toUserId));

  const toRemove = hasGoldRoleSet.difference(receivedGoldRecentlySet);

  for (const userId of toRemove) {
    const member = usersWithGoldRole.find((m) => m.id === userId);
    if (!member) continue;
    await member.roles.remove(goldRole);
  }
});
