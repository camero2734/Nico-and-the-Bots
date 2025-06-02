import { ApplicationCommandOptionType, roleMention } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";
import {
  cron,
  songBattleCron,
  updateCurrentSongBattleMessage,
  updatePreviousSongBattleMessage,
} from "../../scheduled/songbattle";

const command = new SlashCommand({
  description: "Test command",
  options: [
    {
      name: "num",
      description: "Number of times to test",
      required: true,
      type: ApplicationCommandOptionType.Integer,
    },
  ],
});

command.setHandler(async (ctx) => {
  if (ctx.user.id !== userIDs.me) return;

  await ctx.deferReply({ ephemeral: true });

  const roles = await ctx.guild.roles.fetch();
  const withColor = roles.filter((r) => r.hexColor.toLowerCase() === "#ffc6d5");
  if (ctx.opts.num === 1) {
    // Update those who are in the server but are not marked as such
    const membersInServerIds = new Set((await ctx.guild.members.fetch()).keys());
    const inactiveUsers = new Set(
      (
        await prisma.user.findMany({
          select: { id: true },
          where: { currentlyInServer: false },
        })
      ).map((u) => u.id),
    );

    const membersMarkedInactive = membersInServerIds.intersection(inactiveUsers);

    console.log("Members marked inactive", membersMarkedInactive.size);

    await prisma.user.updateMany({
      where: { id: { in: Array.from(membersMarkedInactive) } },
      data: { currentlyInServer: true },
    });

    // Update those who are not in the server but are marked as such
    const activeUsers = new Set(
      (
        await prisma.user.findMany({
          select: { id: true },
          where: { currentlyInServer: true },
        })
      ).map((u) => u.id),
    );
    const leftMembers = Array.from(activeUsers.difference(membersInServerIds));
    const batchSize = 10000;

    for (let i = 0; i < leftMembers.length; i += batchSize) {
      const batch = leftMembers.slice(i, i + batchSize);
      await prisma.user.updateMany({
        where: { id: { in: batch } },
        data: { currentlyInServer: false },
      });
    }

    await ctx.editReply("Done");
  } else if (ctx.opts.num === 2) {
    await updateCurrentSongBattleMessage();
  } else if (ctx.opts.num === 3) {
    await updatePreviousSongBattleMessage(1);
  } else if (ctx.opts.num === 42) {
    for (const role of withColor.values()) {
      await role.delete();
    }

    await ctx.editReply("Done");
  } else if (ctx.opts.num === 69) {
    const concertChannelManager = getConcertChannelManager(ctx.guild);
    await concertChannelManager.initialize();
    await concertChannelManager.checkChannels();
    await ctx.editReply("Done checking concert channels");
  } else if (ctx.opts.num === 420) {
    // songBattleCron();
    const nextRun = cron.nextRun();
    if (!nextRun) throw new CommandError("Next run is null");

    const timeStamp = F.discordTimestamp(nextRun, "relative");
    await ctx.editReply(`Next run: ${timeStamp} (\`${timeStamp}\`)`);
  } else if (ctx.opts.num === 433) {
    songBattleCron();
  } else if (ctx.opts.num === 444) {
    const bfx1 = await ctx.guild.roles.fetch("1373674037204484167");
    const bfx2 = await ctx.guild.roles.fetch("1373724238695108761");

    if (!bfx1 || !bfx2) {
      throw new CommandError("One of the roles is not found");
    }
    const bfxHolders = new Set<string>();
    for (const member of bfx1.members.values()) {
      bfxHolders.add(member.id);
    }
    for (const member of bfx2.members.values()) {
      bfxHolders.add(member.id);
    }

    const membersInDatabaseWithoutBfxBadge = await prisma.user.findMany({
      select: { id: true },
      where: {
        badges: {
          none: {
            type: "BFX",
          },
        },
      },
    });

    const membersInDatabaseSet = new Set(membersInDatabaseWithoutBfxBadge.map((u) => u.id));

    const members = Array.from(bfxHolders.intersection(membersInDatabaseSet));
    const batchSize = 1000;

    for (let i = 0; i < members.length; i += batchSize) {
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(members.length / batchSize)}`);
      const batch = members.slice(i, i + batchSize);
      await prisma.badge.createMany({
        data: batch.map((id) => ({
          userId: id,
          type: "BFX",
        })),
        skipDuplicates: true,
      });
    }
    await ctx.editReply("Done processing BFX members");
  } else {
    const msg = withColor.map((x) => roleMention(x.id)).join("\n");

    await ctx.editReply(msg);
  }
});

export default command;
