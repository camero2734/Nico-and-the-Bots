import { EmbedBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType } from "discord.js";
import { channelIDs, roles as roleIDs, userIDs } from "../../../Configuration/config";
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
    const channel = await ctx.guild.channels.fetch(channelIDs.fairlyannouncements);
    if (!channel || !channel.isTextBased()) {
      throw new CommandError("Channel not found or not text-based");
    }
    const msg = await channel.messages.fetch("1486107522086605050");
    if (!msg) throw new CommandError("Message not found");

    const newMem = await ctx.guild.members.fetch("706274989082673232");
    const embed = new EmbedBuilder()
      .setAuthor({
        name: newMem.displayName,
        icon_url: newMem.displayAvatarURL(),
      })
      .setDescription(
        `He tried to stop the cycle and failed. This has happened 1 time already.`,
      )
      .setFooter({
        text: "MATERIAL SUBJECT TO AUDIT UNDER NOVA BISHOP PROTOCOL",
        icon_url: newMem.client.user?.displayAvatarURL(),
      });

    await msg.edit({ embeds: [embed], allowedMentions: { users: [newMem.id] } });
  }
});

export default command;
