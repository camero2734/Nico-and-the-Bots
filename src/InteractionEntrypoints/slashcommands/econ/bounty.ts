import { EmbedBuilder } from "@discordjs/builders";
import { addHours, differenceInHours, millisecondsToSeconds } from "date-fns";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import type { BishopType } from "../../../../generated/prisma/client";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { sendViolationNotice } from "../../../Helpers/dema-notice";
import F from "../../../Helpers/funcs";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { districts } from "./_consts";

const BOUNTY_USE_COOLDOWN_HOURS = 12;
const BOUNTY_VICTIM_PROTECTION_HOURS = 24;
const BOUNTY_FAILURE_PENALTY = 50;
const BOUNTY_FAILURE_MUTE_MS = 30_000;

const command = new SlashCommand({
  description: "Reap a bounty by reporting a user to the Dema Council. Displays inventory if no user specified.",
  options: [
    {
      name: "user",
      description: "The user the bounty is on, who receives a violation notice if caught by the Bishops.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
});

command.setHandler(async (ctx) => {
  const user = ctx.opts.user;
  const isInventoryCmd = !user;

  if (ctx.opts.user === ctx.member.id) {
    throw new CommandError(
      "Sacred Vialist Amendment IV § 280 prohibits self-incrimination under the pretense of monetary gain",
    );
  }

  if (isInventoryCmd) await ctx.deferReply({ flags: MessageFlags.Ephemeral });
  else await ctx.deferReply();

  const dbUser = await queries.findOrCreateUser(ctx.member.id, {
    dailyBox: true,
  });
  const dailyBox = dbUser.dailyBox ?? (await prisma.dailyBox.create({ data: { userId: ctx.member.id } }));

  if (isInventoryCmd) {
    const { steals, blocks } = dailyBox;

    const embed = new EmbedBuilder()
      .setTitle("Your inventory")
      .addFields([
        {
          name: "📑 Bounties",
          value: `${steals} bount${steals === 1 ? "y" : "ies"} available`,
          inline: true,
        },
        {
          name: "<:jumpsuit:860724950070984735> Jumpsuits",
          value: `${blocks} jumpsuit${blocks === 1 ? "" : "s"} available`,
          inline: true,
        },
        {
          name: "Current bounty value",
          value: `1% of the target's credits, up to 3000 credits`,
        },
      ])
      .setFooter({
        text: "You can use a bounty by mentioning the user in the command. You will recieve the bounty amount if successful. A jumpsuit is automatically used to protect you from being caught when a bounty is enacted against you.",
      });

    await ctx.send({ embeds: [embed.toJSON()] });
    return;
  }

  // Perform some checks
  if (user === userIDs.me) throw new CommandError(`The Dema Council has no interest in prosecuting <@${userIDs.me}>.`);
  if (dailyBox.steals < 1)
    throw new CommandError("You have no bounties to use. Try to get some by using `/econ resupply`.");

  if (dbUser.level < 10) {
    throw new CommandError(
      `You must be at least level 10 to enact a bounty.`,
    );
  }

  const member = await ctx.member.guild.members.fetch(user);
  if (!member || member.user.bot)
    throw new CommandError(`${member.displayName} investigated himself and found no wrong-doing. Case closed.`);

  const otherDBUser = await queries.findOrCreateUser(member.id, {
    dailyBox: true,
  });

  if (otherDBUser.level < 10) {
    throw new CommandError(
      `As <@${user}> is below level 10, the Dema Council has no interest in expending resources to investigate them.`,
    );
  }
  const otherDailyBox = otherDBUser.dailyBox ?? (await prisma.dailyBox.create({ data: { userId: member.id } }));

  const { lastBountyUsedAt } = dbUser;
  const { lastBountiedAt } = otherDBUser;

  if (lastBountyUsedAt && differenceInHours(new Date(), lastBountyUsedAt) < BOUNTY_USE_COOLDOWN_HOURS) {
    const nextAvailable = addHours(lastBountyUsedAt, BOUNTY_USE_COOLDOWN_HOURS);
    const timestamp = F.discordTimestamp(nextAvailable, "relative");
    throw new CommandError(`You have recently issued a bounty. You can do another ${timestamp}.`);
  }

  if (lastBountiedAt && differenceInHours(new Date(), lastBountiedAt) < BOUNTY_VICTIM_PROTECTION_HOURS) {
    const nextAvailable = addHours(lastBountiedAt, BOUNTY_VICTIM_PROTECTION_HOURS);
    const timestamp = F.discordTimestamp(nextAvailable, "relative");
    throw new CommandError(
      `The Dema Council has recently investigated <@${user}>. They can be bountied again ${timestamp}.`,
    );
  }

  // Template embed
  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${ctx.member.displayName}'s Bounty`,
      icon_url: ctx.member.user.displayAvatarURL(),
    })
    .setFooter({ text: `Bounties remaining: ${dailyBox.steals - 1}` });

  const assignedBishop = F.randomValueInArray(districts);

  // Some dramatic waiting time
  const waitEmbed = new EmbedBuilder(embed.toJSON())
    .setDescription(
      `Thank you for reporting <@${user}> to the Dema Council for infractions against the laws of The Sacred Municipality of Dema.\n\nWe have people on the way to find and rehabilitate them under the tenets of Vialism.`,
    )
    .addFields([
      {
        name: "Assigned Bishop",
        value: `<:emoji:${assignedBishop.emoji}> ${assignedBishop.bishop}`,
      },
    ])
    .setImage(
      "https://web.archive.org/web/20230720112840if_/https://thumbs.gfycat.com/ConcernedFrightenedArrowworm-max-1mb.gif",
    );

  await ctx.send({ embeds: [waitEmbed.toJSON()] });
  await F.wait(10000);

  if (otherDailyBox.blocks > 0) {
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE "User"
        SET credits = GREATEST(credits - ${BOUNTY_FAILURE_PENALTY}, 0), "lastBountyUsedAt" = NOW()
        WHERE id = ${ctx.member.id}
      `,
      prisma.dailyBox.update({
        where: { userId: ctx.member.id },
        data: { steals: { decrement: 1 } },
      }),
      prisma.dailyBox.update({
        where: { userId: member.id },
        data: { blocks: { decrement: 1 } },
      }),
    ]);

    const failedEmbed = new EmbedBuilder(embed.toJSON()).setDescription(
      `<@${user}>'s Jumpsuit successfully prevented the Bishops from finding them. Your bounty failed. For false reporting, the Dema Council has issued you a **${BOUNTY_FAILURE_PENALTY} credit** penalty and silenced you for ${millisecondsToSeconds(BOUNTY_FAILURE_MUTE_MS)} seconds.`,
    );

    await ctx.member.timeout(BOUNTY_FAILURE_MUTE_MS, "Failed bounty attempt");
    await ctx.editReply({ embeds: [failedEmbed] });
  } else {
    const stolenCredits = Math.floor(Math.min(3000, 0.01 * otherDBUser.credits));

    await prisma.$transaction([
      prisma.user.update({
        where: { id: ctx.member.id },
        data: { credits: { increment: stolenCredits }, lastBountyUsedAt: new Date() },
      }),
      prisma.$executeRaw`
        UPDATE "User"
        SET credits = GREATEST(credits - ${stolenCredits}, 0), "lastBountiedAt" = NOW()
        WHERE id = ${member.id}
      `,
      prisma.dailyBox.update({
        where: { userId: ctx.member.id },
        data: { steals: { decrement: 1 } },
      }),
    ]);

    const winEmbed = new EmbedBuilder(embed.toJSON()).setDescription(
      `<@${user}> was found by the Bishops and has been issued a violation order and has paid ${stolenCredits} credits as penance.\n\nIn reward for your service to The Sacred Municipality of Dema and your undying loyalty to Vialism, you have been rewarded \`${stolenCredits}\` credits.`,
    );

    sendViolationNotice(member, {
      violation: "FailedPerimeterEscape",
      issuingBishop: F.capitalize(assignedBishop.bishop) as BishopType,
    });

    await ctx.editReply({ embeds: [winEmbed.toJSON()] });
  }
});

export default command;
