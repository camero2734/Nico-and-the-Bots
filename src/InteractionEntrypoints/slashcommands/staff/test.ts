import { LabelBuilder, ModalBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType, ComponentType, RadioGroupComponentData } from "discord.js";
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

interface RadioGroupData extends Omit<RadioGroupComponentData, "customId"> {
  custom_id: string;
}

function addRadioComponent(modal: ModalBuilder, data: RadioGroupData, label: string) {
  const labelBuilder = new LabelBuilder().setLabel(label);
  labelBuilder['data'].component = { toJSON: () => data } as any;
  modal.addLabelComponents(labelBuilder);
}

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
    const data: RadioGroupData = {
      type: ComponentType.RadioGroup,
      custom_id: "myVeryCoolCheckbox",
      options: [
        { value: "march-4", label: "March 4th" },
        { value: "march-5", label: "March 5th" },
        { value: "march-7", label: "March 7th", description: "I know this is a Saturday and is tough" },
        { value: "march-9", label: "March 9th" },
        { value: "march-10", label: "March 10th" }
      ]
    }

    const modal = new ModalBuilder()
      .setTitle("My Modal")
      .setCustomId("myModal")

    addRadioComponent(modal, data, "Select a date");
    addRadioComponent(modal, { ...data, custom_id: "myVeryCoolCheckbox2" }, "Select a date again");

    await ctx.showModal(modal.toJSON(false));
  }
});

export default command;
