import { LabelBuilder, ModalBuilder } from "@discordjs/builders";
import { CheckboxGroupComponentData, ComponentType, RadioGroupComponentData, TextInputStyle } from "discord.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Test command",
  options: []
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
  const modal = new ModalBuilder()
    .setTitle("Torchbearers Application")
    .setCustomId("myModal");

  addRadioComponent(modal, "Where did you find out about the server?", {
    type: ComponentType.RadioGroup,
    custom_id: "where_did_you_find_out",
    options: [
      { value: "reddit", label: "Reddit" },
      { value: "twitter", label: "Twitter" },
      { value: "bluesky", label: "Bluesky" },
      { value: "instagram", label: "Instagram" },
      { value: "friend", label: "A friend" },
      { value: "other", label: "Other", description: "Feel free to specify in the final comment section." }
    ]
  });

  addCheckboxComponent(modal, "How have you been involved in server events?", {
    type: ComponentType.CheckboxGroup,
    custom_id: "server_events",
    options: [
      { value: "have_participated", label: "I have participated in events in the server before" },
      { value: "have_hosted", label: "I have helped host events in the server before" },
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
});

export default command;
