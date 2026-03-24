import {
  ActionRowBuilder,
  ContainerBuilder,
  EmbedBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder
} from "@discordjs/builders";
import { addDays } from "date-fns";
import {
  type CheckboxGroupComponentData,
  Colors,
  ComponentType,
  type Guild,
  MessageFlags,
  type RadioGroupComponentData,
  TextInputStyle,
} from "discord.js";
import { channelIDs, emojiIDs, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { generateScoreCard } from "../econ/score";
import { FB_DELAY_DAYS, getActiveFirebreathersApplication } from "./_consts";

const command = new SlashCommand({
  description: "Opens an application to the Firebreathers role",
  options: [],
});

enum ActionTypes {
  Accept = 0,
  Deny = 1,
}

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
  if (!ctx.member.roles.cache.has(roles.staff)) {
    throw new CommandError("Command unavailable");
  }

  if (ctx.member.roles.cache.has(roles.deatheaters)) {
    throw new CommandError("You are already a firebreather!");
  }

  const activeApplication = await getActiveFirebreathersApplication(ctx.user.id);

  if (activeApplication?.submittedAt) {
    const timestamp = F.discordTimestamp(activeApplication.submittedAt || new Date(), "relative");
    throw new CommandError(
      `Your previous application has not been reviewed by staff yet.\n\nIt was submitted ${timestamp}.`,
    );
  }
  if (activeApplication?.decidedAt) {
    const timestamp = F.discordTimestamp(
      addDays(activeApplication.submittedAt || new Date(), FB_DELAY_DAYS),
      "relative",
    );
    throw new CommandError(`You have already recently applied! You can apply again ${timestamp}`);
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

// User submits the application modal, send the application to staff for review
const genModalId = command.addInteractionListener("tbSubmitModal", ["applicationId"], async (ctx, opts) => {
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
    data: { submittedAt: new Date(), messageUrl, responseData: data },
  });

  await ctx.editReply({
    content: "Your application has been submitted! The staff team will review it shortly.",
  });
});

export async function sendToStaff(
  guild: Guild,
  applicationId: string,
  data: Record<string, string>,
): Promise<string | undefined> {
  try {
    const tbApplicationChannel = await guild.channels.fetch(channelIDs.deapplications);
    if (!tbApplicationChannel?.isTextBased()) throw new Error("TB Application channel not found");

    const application = await prisma.firebreatherApplication.findUnique({
      where: { applicationId },
    });
    if (!application) throw new Error("No application found");

    const member = await guild.members.fetch(application.userId);
    if (!member) throw new Error("No member found");

    const scoreCard = await generateScoreCard(member);

    // Create main container with application details
    const mainContainer = new ContainerBuilder().setAccentColor(Colors.Blue);

    // Header section with member info and thumbnail
    // mainContainer.addSectionComponents(
    //   new SectionBuilder()
    //     .addTextDisplayComponents(
    //       new TextDisplayBuilder().setContent(
    //         `## Torchbearers Application\n` +
    //         `**Applicant:** ${userMention(member.id)}\n` +
    //         `**Application ID:** \`${applicationId}\`\n` +
    //         `**User ID:** \`${member.id}\``,
    //       ),
    //     )
    //     .setThumbnailAccessory(
    //       new ThumbnailBuilder({
    //         media: { url: member.displayAvatarURL({ extension: "png", size: 256 }) },
    //       }),
    //     ),
    // );

    // // Application responses
    // const responsesText = Object.entries(data)
    //   .map(([name, value]) => `**${name}**\n${value?.substring(0, 1000) || "*Nothing*"}`)
    //   .join("\n\n");
    // mainContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(responsesText));

    // Action buttons section - add to container directly
    // mainContainer.addActionRowComponents(
    //   new ActionRowBuilder().addComponents(
    //     new StringSelectMenuBuilder()
    //       .addOptions([
    //         new StringSelectMenuOptionBuilder({
    //           label: "Accept",
    //           value: ActionTypes.Accept.toString(),
    //           emoji: { id: emojiIDs.upvote },
    //         }),
    //         new StringSelectMenuOptionBuilder({
    //           label: "Deny",
    //           value: ActionTypes.Deny.toString(),
    //           emoji: { id: emojiIDs.downvote },
    //         }),
    //       ])
    //       .setPlaceholder("Select an action")
    //       .setCustomId(genStaffModalId({ applicationId })),
    //   ),
    // );

    mainContainer.addTextDisplayComponents(builder => builder.setContent("Test!"))

    const m = await tbApplicationChannel.send({
      components: [mainContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    try {
      const thread = await m.startThread({
        name: `${member.displayName} application discussion (${applicationId})`,
        autoArchiveDuration: 10080,
      });

      // Send score card in thread with v2 components
      const scoreContainer = new ContainerBuilder().setAccentColor(Colors.Gold);
      scoreContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## Score Card for ${member.displayName}`),
      );
      scoreContainer.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(`attachment://score.png`)
            .setDescription(`${member.displayName}'s score card`),
        ),
      );

      await thread.send({
        content: `${member}`,
        components: [scoreContainer],
        files: [{ attachment: scoreCard, name: "score.png" }],
        flags: MessageFlags.IsComponentsV2,
      });

      // Get user warnings
      const userWarnings = await prisma.warning.findMany({
        where: { warnedUserId: member.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
      const totalWarnings = await prisma.warning.count({
        where: { warnedUserId: member.id },
      });

      // Warnings container
      const warningsContainer = new ContainerBuilder().setAccentColor(
        userWarnings.length > 0 ? Colors.Red : Colors.Green,
      );
      warningsContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${member.displayName}'s Warning History\n**Total Warnings:** ${totalWarnings}`,
        ),
      );

      const warningsText =
        userWarnings.length > 0
          ? userWarnings
            .map(
              (warn) =>
                `**${warn.reason.substring(0, 200)}** [${warn.severity}]\n*${F.discordTimestamp(warn.createdAt, "relative")}*`,
            )
            .join("\n\n")
          : "*This user has no warnings* ✅";
      warningsContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(warningsText));

      await thread.send({
        components: [warningsContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      // Notify user
      const userNotificationContainer = new ContainerBuilder().setAccentColor(Colors.Blue);
      userNotificationContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 📋 Application Received\n\n` +
          `Your Torchbearers application (**${applicationId}**) has been received by the staff. ` +
          `Please allow a few days for it to be reviewed.\n\n` +
          `We'll notify you once a decision has been made.`,
        ),
      );

      await F.sendMessageToUser(member, {
        components: [userNotificationContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      await m.react(emojiIDs.upvote);
      await m.react(emojiIDs.downvote);
    } catch (e) {
      await m.delete();
      return;
    }

    return m.url;
  } catch (e) {
    console.log(e);
  }
}

// Staff clicks accept/deny, show them a modal to optionally provide a reason for their decision
const MODAL_REASON = "tbAppModalReason";
const genStaffModalId = command.addInteractionListener("staffTBAppModal", ["applicationId"], async (ctx, args) => {
  if (!ctx.isStringSelectMenu()) return;

  const action: ActionTypes = +ctx.values[0];

  const verb = action === ActionTypes.Accept ? "Accept" : "Deny";
  const verbPast = action === ActionTypes.Accept ? "accepted" : "denied";

  const modal = new ModalBuilder()
    .setTitle(`${verb}ing Torchbearers Application`)
    .setCustomId(genId({ applicationId: args.applicationId, type: action.toString() }));

  const reasonInput = new LabelBuilder()
    .setLabel(`${verb} Reason`)
    .setTextInputComponent(
      new TextInputBuilder()
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder(`Why was the application ${verbPast}? This is optional and will be sent to the user.`)
        .setCustomId(MODAL_REASON),
    );

  await ctx.showModal(modal.addLabelComponents(reasonInput));
});

// Staff submits the modal, update application and notify user of the decision
const genId = command.addInteractionListener("staffTBAppRes", ["applicationId", "type"], async (ctx, args) => {
  await ctx.deferUpdate();
  await ctx.editReply({ components: [] });

  if (!ctx.isModalSubmit()) return;

  const action: ActionTypes = +args.type;
  const reason = ctx.components.getTextInputValue(MODAL_REASON);

  const applicationId = args.applicationId;
  const application = await prisma.firebreatherApplication.findUnique({
    where: { applicationId },
  });
  if (!application) throw new CommandError("This application no longer exists");

  const member = await ctx.guild.members.fetch(application.userId);
  if (!member) throw new CommandError("This member appears to have left the server");

  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Torchbearers Application results",
      icon_url: member.client.user?.displayAvatarURL(),
    })
    .setFooter({ text: applicationId });

  if (reason) embed.addFields({ name: "Reason", value: reason });

  const msgEmbed = new EmbedBuilder(ctx.message.embeds[0].toJSON());

  if (action === ActionTypes.Accept) {
    await prisma.firebreatherApplication.update({
      where: { applicationId },
      data: { approved: true, decidedAt: new Date() },
    });
    await member.roles.add(roles.deatheaters);

    embed.setAuthor({
      name: "Torchbearers Application Approved",
      icon_url: member.client.user?.displayAvatarURL(),
    });
    embed.setDescription(`You are officially a Torchbearer! You may now access <#${channelIDs.fairlylocals}>`);

    await ctx.editReply({ embeds: [msgEmbed.setColor(Colors.Green)] });
  } else if (action === ActionTypes.Deny) {
    await prisma.firebreatherApplication.update({
      where: { applicationId },
      data: { approved: false, decidedAt: new Date() },
    });

    const timestamp = F.discordTimestamp(addDays(application.submittedAt || new Date(), FB_DELAY_DAYS), "relative");

    embed.setAuthor({
      name: "Torchbearers Application Denied",
      icon_url: member.client.user?.displayAvatarURL(),
    });
    embed.setDescription(`Unfortunately, your application for TB was denied. You may reapply ${timestamp}`);
    await ctx.editReply({ embeds: [msgEmbed.setColor(Colors.Red)] });
  } else throw new Error("Invalid action type");

  const doneByEmbed = new EmbedBuilder()
    .setAuthor({
      name: ctx.member.displayName,
      icon_url: ctx.member.displayAvatarURL(),
    })
    .setDescription(`${ctx.member} ${action === ActionTypes.Accept ? "accepted" : "denied"} ${member}'s TB application`)
    .addFields([{ name: "Reason", value: reason || "*No reason given*" }])
    .setFooter({ text: applicationId });

  const thread = ctx.message.thread;
  if (thread) {
    await thread.setArchived(true, "Decision was made, thread no longer necessary");

    doneByEmbed.addFields([{ name: "Thread", value: `${thread}` }]);
  }

  await ctx.followUp({ embeds: [doneByEmbed] });

  await F.sendMessageToUser(member, { embeds: [embed] });
});

export default command;
