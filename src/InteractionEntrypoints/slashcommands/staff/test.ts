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
        { value: "march-4", label: "Reddit" },
        { value: "march-5", label: "Twitter" },
        { value: "march-7", label: "Instagram" },
        { value: "march-9", label: "A friend" },
        { value: "march-10", label: "Other", description: "Feel free to specify in the comments" }
      ]
    });

    addCheckboxComponent(modal, "How have you been involved in Discord Clique events?", {
      type: ComponentType.CheckboxGroup,
      custom_id: "discord_clique_events",
      options: [
        { value: "have_participated", label: "I have participated in events in the server before" },
        { value: "have_hosted", label: "I have hosted events in the server before" },
        { value: "willing_to_host", label: "I would love to help host events in the future" }
      ]
    });

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel("Is there any questionable behavior that the staff might find upon reviewing your server history? If so, please describe.")
        .setDescription("This encompasses things such as messages, warnings, and overall demeanor towards others. Please be as thorough as possible and provide context to anything that needs it.")
        .setTextInputComponent((builder) =>
          builder.setCustomId("questionable_behavior").setStyle(TextInputStyle.Paragraph).setRequired(false)
        )
    );

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel("What do you like/dislike about the Discord Clique community?")
        .setDescription("This can be anything from the general vibe of the community to specific events or channels. Please be as honest and thorough as possible.")
        .setTextInputComponent((builder) =>
          builder.setCustomId("like_dislike").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
    )

    modal.addLabelComponents(
      new LabelBuilder()
        .setLabel("If you have any other final thoughts or comments regarding your application or your qualification, please leave them here.")
        .setDescription("You can use this space to expand on previous questions or talk about anything else that you think is relevant to your application.")
        .setTextInputComponent((builder) =>
          builder.setCustomId("additional_comments").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
    )

    await ctx.showModal(modal.toJSON(false));
  }
});

export default command;
