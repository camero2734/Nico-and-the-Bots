import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { ActionRowBuilder, StringSelectMenuBuilder } from "@discordjs/builders";
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
      description: "Number of times to test",
      required: false,
      type: ApplicationCommandOptionType.Integer,
    },
    {
      name: "separator",
      description: "A separator",
      required: false,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "gap",
      description: "A gap",
      required: false,
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: "divider",
      description: "A divider",
      required: false,
      type: ApplicationCommandOptionType.Boolean,
    },
  ],
});

command.setHandler(async (ctx) => {
  if (ctx.user.id !== userIDs.me) return;

  await ctx.deferReply();

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
  } else if (ctx.opts.num === 433) {
    songBattleCron();
  } else {
    const stringSelect = new StringSelectMenuBuilder()
      .setCustomId("a cool select menu")
      .setPlaceholder("select an option")
      .setMaxValues(2)
      .setOptions([
        { label: "option 1 <@&557303189976907788>", value: "1" },
        { label: "option 2", value: "2" },
        { label: "option 3", value: "3" },
      ]);

    const actionRow = new ActionRowBuilder().addComponents(stringSelect);

    await ctx.editReply({ components: [actionRow], flags: MessageFlags.IsComponentsV2 });
  }
});

export default command;
