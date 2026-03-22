import { LabelBuilder, ModalBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType, CheckboxGroupComponentData, ComponentType, RadioGroupComponentData, TextInputStyle } from "discord.js";
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

interface CheckboxGroupData extends Omit<CheckboxGroupComponentData, "customId"> {
  custom_id: string;
}

function addRadioComponent(modal: ModalBuilder, label: string, data: RadioGroupData) {
  const labelBuilder = new LabelBuilder().setLabel(label);
  labelBuilder['data'].component = { toJSON: () => data } as any;
  modal.addLabelComponents(labelBuilder);
}

function addCheckboxComponent(modal: ModalBuilder, label: string, data: CheckboxGroupData) {
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
    const modal = new ModalBuilder()
      .setTitle("Torchbearers Application")
      .setCustomId("myModal");

    addRadioComponent(modal, "Where did you find out about our server?", {
      type: ComponentType.RadioGroup,
      custom_id: "where_did_you_find_out",
      options: [
        { value: "reddit", label: "Reddit" },
        { value: "twitter", label: "Twitter" },
        { value: "instagram", label: "Instagram" },
        { value: "friend", label: "A friend" },
        { value: "other", label: "Other", description: "Feel free to specify in the comments" }
      ]
    });

    addCheckboxComponent(modal, "How have you been involved in server events?", {
      type: ComponentType.CheckboxGroup,
      custom_id: "server_events",
      options: [
        { value: "have_participated", label: "I have participated in events in the server before" },
        { value: "have_hosted", label: "I have hosted events in the server before" },
        { value: "willing_to_host", label: "I would love to help host events in the future" }
      ]
    });

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel("Likes/dislikes about the server community?")
        .setDescription("The general vibe of the community, events, channels, etc.")
        .setTextInputComponent((builder) =>
          builder.setCustomId("like_dislike").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
    )

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel("Any concerning prior behavior in the server?")
        .setDescription("Including past messages, warnings, and demeanor towards others that reviewers should be aware of.")
        .setTextInputComponent((builder) =>
          builder.setCustomId("questionable_behavior").setStyle(TextInputStyle.Paragraph).setRequired(false)
        )
    );

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel("Final thoughts/comments on your application?")
        .setDescription("Feel free to expand on previous questions or talk about anything else that you think is relevant.")
        .setTextInputComponent((builder) =>
          builder.setCustomId("additional_comments").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
    )

    await ctx.showModal(modal.toJSON(false));
  }
});

export default command;
