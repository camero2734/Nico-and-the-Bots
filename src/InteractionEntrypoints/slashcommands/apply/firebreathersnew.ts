import { LabelBuilder, ModalBuilder } from "@discordjs/builders";
import {
  type CheckboxGroupComponentData,
  ComponentType,
  MessageFlags,
  type RadioGroupComponentData,
  TextInputStyle,
} from "discord.js";
import { roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { FB_DELAY_DAYS, getActiveFirebreathersApplication } from "./_consts";
import { sendToStaff } from "./firebreathers";

const command = new SlashCommand({
  description: "Opens an application to the Firebreathers role",
  options: [],
});

interface RadioGroupData extends Omit<RadioGroupComponentData, "customId"> {
  custom_id: string;
}

interface CheckboxGroupData extends Omit<CheckboxGroupComponentData, "customId"> {
  custom_id: string;
}

function addRadioComponent(modal: ModalBuilder, label: string, data: RadioGroupData) {
  const labelBuilder = new LabelBuilder().setLabel(label);
  labelBuilder["data"].component = { toJSON: () => data } as any;
  modal.addLabelComponents(labelBuilder);
}

function addCheckboxComponent(modal: ModalBuilder, label: string, data: CheckboxGroupData) {
  const labelBuilder = new LabelBuilder().setLabel(label);
  labelBuilder["data"].component = { toJSON: () => data } as any;
  modal.addLabelComponents(labelBuilder);
}

command.setHandler(async (ctx) => {
  await ctx.deferReply({ flags: MessageFlags.Ephemeral });

  if (ctx.member.roles.cache.has(roles.deatheaters)) {
    throw new CommandError("You are already a firebreather!");
  }

  const activeApplication = await getActiveFirebreathersApplication(ctx.user.id);

  if (activeApplication && ctx.user.id !== userIDs.myAlt) {
    if (activeApplication.decidedAt) {
      const timestamp = F.discordTimestamp(new Date(Date.now() + FB_DELAY_DAYS * 24 * 60 * 60 * 1000), "relative");
      throw new CommandError(`You have already recently applied! You can apply again ${timestamp}`);
    }
    if (!activeApplication.submittedAt) {
      throw new CommandError(
        `You have not submitted your previous application. To do so, use the button/message again.\n\nIf you believe this is a mistake, please contact the staff.`,
      );
    }
    const timestamp = F.discordTimestamp(activeApplication.submittedAt || new Date(), "relative");
    throw new CommandError(
      `Your previous application has not been reviewed by staff yet.\n\nIt was submitted ${timestamp}.`,
    );
  }

  let application = activeApplication;
  if (!application) {
    application = await prisma.firebreatherApplication.create({
      data: { userId: ctx.user.id, startedAt: new Date() },
    });
  }

  const modal = new ModalBuilder()
    .setTitle("Torchbearers Application")
    .setCustomId(genModalId({ applicationId: application.applicationId }));

  addRadioComponent(modal, "Where did you find out about the server?", {
    type: ComponentType.RadioGroup,
    custom_id: "where_did_you_find_out",
    options: [
      { value: "reddit", label: "Reddit" },
      { value: "twitter", label: "Twitter" },
      { value: "bluesky", label: "Bluesky" },
      { value: "instagram", label: "Instagram" },
      { value: "friend", label: "A friend" },
      { value: "other", label: "Other", description: "Feel free to specify in the final comment section." },
    ],
  });

  addCheckboxComponent(modal, "Would you be willing to help host events?", {
    type: ComponentType.CheckboxGroup,
    custom_id: "server_events",
    minValues: 1,
    options: [
      { value: "art", label: "Art events" },
      { value: "gaming", label: "Gaming events" },
      { value: "music", label: "Music events" },
      { value: "social", label: "Social events" },
      { value: "none", label: "I am not interested in helping with events" },
    ],
  });

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Likes/dislikes about the server community?")
      .setDescription("The general vibe of the community, events, channels, etc.")
      .setTextInputComponent((builder) =>
        builder.setCustomId("like_dislike").setStyle(TextInputStyle.Paragraph).setRequired(true),
      ),
  );

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Any concerning prior behavior in the server?")
      .setDescription(
        "Including past messages, warnings, and demeanor towards others that reviewers should be aware of.",
      )
      .setTextInputComponent((builder) =>
        builder.setCustomId("questionable_behavior").setStyle(TextInputStyle.Paragraph).setRequired(false),
      ),
  );

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel("Final thoughts/comments on your application?")
      .setDescription(
        "Feel free to expand on previous questions or talk about anything else that you think is relevant.",
      )
      .setTextInputComponent((builder) =>
        builder.setCustomId("additional_comments").setStyle(TextInputStyle.Paragraph).setRequired(true),
      ),
  );

  await ctx.showModal(modal.toJSON(false));
});

const genModalId = command.addInteractionListener("tbAppModal", ["applicationId"], async (ctx, opts) => {
  if (!ctx.isModalSubmit()) return;

  const applicationId = opts.applicationId;

  await ctx.deferReply({ flags: MessageFlags.Ephemeral });

  const whereDidYouFindOut = ctx.components.getRadioGroup("where_did_you_find_out") || "Not provided";
  const serverEvents = ctx.components.getCheckboxGroup("server_events")?.join(", ") || "None selected";
  const likeDislike = ctx.components.getTextInputValue("like_dislike") || "Not provided";
  const questionableBehavior = ctx.components.getTextInputValue("questionable_behavior") || "None";
  const additionalComments = ctx.components.getTextInputValue("additional_comments") || "Not provided";

  const data: Record<string, string> = {
    "Where did you find out about the server?": whereDidYouFindOut,
    "Would you be willing to help host events?": serverEvents,
    "Likes/dislikes about the server community?": likeDislike,
    "Any concerning prior behavior in the server?": questionableBehavior,
    "Final thoughts/comments on your application?": additionalComments,
  };

  const messageUrl = await sendToStaff(ctx.guild, applicationId, data);
  if (!messageUrl) {
    throw new CommandError("Failed to send application to staff. Please contact an administrator.");
  }

  await prisma.firebreatherApplication.update({
    where: { applicationId },
    data: { submittedAt: new Date(), messageUrl, responseData: data as any },
  });

  await ctx.editReply({
    content: "Your application has been submitted! The staff team will review it shortly.",
  });
});

export default command;
