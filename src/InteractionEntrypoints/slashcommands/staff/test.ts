import { ApplicationCommandOptionType, roleMention } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { roles as roleIDs } from "../../../Configuration/config";
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
    const role = await ctx.guild.roles.fetch(roleIDs.new);
    if (!role) {
      throw new CommandError("New role not found");
    }

    const m = await ctx.editReply(`Removing role ${role.name} from members...`);

    let i = 0;
    for (const member of role.members.values()) {
      if (i % 10 === 0) await ctx.editReply(`${m.content} (${i}/${role.members.size})`);
      await member.roles.remove(role);
      i++;
    }

    await ctx.editReply(`${m.content} (${i}/${role.members.size})\nDone removing role ${role.name} from members.`);
  } else if (ctx.opts.num === 2) {
    await updateCurrentSongBattleMessage();
  } else if (ctx.opts.num === 3) {
    await updatePreviousSongBattleMessage(1);
  } else if (ctx.opts.num === 42) {
    for (const role of withColor.values()) {
      await role.delete();
    }

    await ctx.editReply("Done");
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
