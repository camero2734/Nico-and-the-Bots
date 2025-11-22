import { getColorRoleCategories } from "InteractionEntrypoints/messageinteractions/shop.consts";
import {
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
} from "discord.js";
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
      required: true,
      type: ApplicationCommandOptionType.Integer,
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
    // const container = new ContainerBuilder().setAccentColor(0xd07a21);
    const containers = [];

    for (const [categoryName, categoryData] of Object.entries(getColorRoleCategories(ctx.guild.roles))) {
      const roleMentions = categoryData.data.roles.map((r) => `<@&${r.id}>`).join(" ");

      const section = new SectionBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${categoryName}\n${categoryData.description}\n\n${roleMentions}`),
      );

      const button = new ButtonBuilder()
        .setLabel(`View ${categoryName}`)
        .setStyle(ButtonStyle.Primary)
        .setCustomId(Bun.randomUUIDv7());

      section.setButtonAccessory(button);

      const container = new ContainerBuilder().setAccentColor(0xd07a21);
      container.addSectionComponents(section);
      containers.push(container);
    }

    await ctx.editReply({
      components: containers,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  }
});

export default command;
