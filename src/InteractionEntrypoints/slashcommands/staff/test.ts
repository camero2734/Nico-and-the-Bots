import { ApplicationCommandOptionType } from "discord.js";
import { roles as roleIDs, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import {
  songBattleCron,
  updateCurrentSongBattleMessage,
  updatePreviousSongBattleMessage,
} from "../../scheduled/songbattle";

const command = new SlashCommand({
  description: "Test command",
  options: [
    {
      name: "num",
      description: "Command number",
      required: false,
      type: ApplicationCommandOptionType.Integer,
    }
  ],
});

command.setHandler(async (ctx) => {
  if (ctx.user.id !== userIDs.me) return;

  if (ctx.opts.num === 1) {
    await ctx.deferReply();
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
    await ctx.deferReply();
    await updateCurrentSongBattleMessage();
  } else if (ctx.opts.num === 3) {
    await ctx.deferReply();
    await updatePreviousSongBattleMessage(1);
  } else if (ctx.opts.num === 433) {
    await ctx.deferReply();
    songBattleCron();
  } else {
    throw new CommandError("Invalid number");
  }
});

export default command;
