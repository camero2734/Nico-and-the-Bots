import { EmbedBuilder } from "@discordjs/builders";
import {
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  type CommandInteraction,
  type DMChannel,
  type GuildTextBasedChannel,
  type Interaction,
  InteractionType,
  MessageFlags,
  type ModalSubmitInteraction,
  type TextBasedChannel,
  type TextChannel,
} from "discord.js";
import { guild } from "../Altbots/nico";
import { channelIDs } from "../Configuration/config";
import { CommandError } from "../Configuration/definitions";
import F from "../Helpers/funcs";
import { WideEvent } from "../Helpers/logging/wide-event";

const getReplyMethod = async (ctx: CommandInteraction | ModalSubmitInteraction) => {
  if (!ctx.isRepliable()) {
    if (ctx.channel?.isSendable()) {
      return ctx.channel.send;
    }
    return () => { };
  }

  if (ctx.isModalSubmit()) {
    if (ctx.deferred) {
      return ctx.editReply;
    }
    await ctx.deferReply({ flags: MessageFlags.Ephemeral, withResponse: true });
    return ctx.editReply;
  }

  if (!ctx.isChatInputCommand()) {
    if (ctx.channel?.isSendable()) {
      return ctx.channel.send;
    }
    return () => { };
  }

  if (!ctx.deferred && !ctx.replied) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral, withResponse: true });
  }

  return ctx.editReply;
};

let errorChannel: GuildTextBasedChannel | null = null;
const getErrorChannel = async () => {
  if (errorChannel) return errorChannel;

  const channel = await guild?.channels.fetch(channelIDs.errorlog);
  if (!channel || channel.type !== ChannelType.GuildText) return null;

  errorChannel = channel;
  return errorChannel;
};

const getChannelName = (ctx: TextBasedChannel | Interaction): string => {
  if ("name" in ctx) return `Text: ${ctx.name}`;
  if ("recipient" in ctx) return `DM: ${ctx.recipient?.tag}`;

  const interactionType =
    F.keys(InteractionType).find((k) => InteractionType[k as keyof typeof InteractionType] === ctx.type) ||
    "Unknown Interaction";
  return `${interactionType}: ${ctx.user.tag} in ${ctx.channel ? getChannelName(ctx.channel) : "?"}`;
};

const getCommandString = (ctx: ChatInputCommandInteraction): string | null => {
  const { commandName, options } = ctx;
  const args = options.data.map((opt) => `${opt.name}:${opt.value}`).join(" ");
  return `/${commandName} ${args}`.trim();
};

export const ErrorHandler = async (
  ctx: TextChannel | DMChannel | Interaction & { wideEvent?: WideEvent },
  wideEvent: WideEvent,
  error: Error,
  handler?: string,
  receivedInteractionAt?: Date,
) => {
  const errorId = wideEvent.event_id;
  const errorDelta = receivedInteractionAt ? Date.now() - receivedInteractionAt.getTime() : null;

  let sentInErrorChannel = false;
  const errorChannel = await getErrorChannel();
  if (errorChannel && !(error instanceof CommandError)) {
    const embed = new EmbedBuilder()
      .setTitle("An error occurred!")
      .setColor(Colors.DarkRed)
      .setDescription(`An error occurred in ${ctx.constructor.name}.\nError ID: ${errorId}`)
      .addFields({
        name: "Channel",
        value: getChannelName(ctx),
      })
      .setTimestamp()
      .setFooter({ text: errorId });

    if (handler) {
      embed.addFields({
        name: "Handler",
        value: handler,
      });
    }

    if (ctx instanceof ChatInputCommandInteraction) {
      embed.addFields({
        name: "Command",
        value: getCommandString(ctx) || "Unable to parse command",
      });
    }

    if (errorDelta) {
      embed.addFields({
        name: "Time to Error",
        value: `${errorDelta}ms`,
      });
    }

    const formatStack = (err: Error): string => {
      const lines: string[] = [`${err.name}: ${err.message}`];
      let current: Error = err;
      while (current?.cause) {
        const cause = current.cause as Error;
        lines.push(`Caused by: ${cause.name}: ${cause.message}`);
        current = cause;
      }
      const stackParts = (err.stack || "").split("\n");
      for (const line of stackParts.slice(1)) {
        if (!line.includes("node:") && !line.includes("node_modules/")) {
          lines.push(line);
        }
      }
      return lines.join("\n");
    };

    embed.addFields({
      name: "Error",
      value: `\`\`\`js\n${error instanceof Error ? formatStack(error) : error}\`\`\``,
    });
    await errorChannel.send({ embeds: [embed] });
    sentInErrorChannel = true;
  }

  const ectx = ctx as unknown as (CommandInteraction | ModalSubmitInteraction) & {
    send: CommandInteraction["reply"];
  };
  ectx.send = (await getReplyMethod(ectx)) as unknown as (typeof ectx)["send"];

  if (!ectx.send) return;

  if (error instanceof CommandError) {
    const embed = new EmbedBuilder()
      .setDescription(error.message)
      .setTitle("An error occurred!")
      .setColor(Colors.DarkRed)
      .setFooter({ text: `DEMA internet machine broke. Error ${errorId}` });
    ectx.send({
      embeds: [embed],
      components: [],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { users: [], roles: [] },
    });
  } else {
    const embed = new EmbedBuilder().setTitle("An unknown error occurred!").setFooter({
      text: `DEMA internet machine really broke. Error ${errorId} ${sentInErrorChannel ? "📝" : ""}`,
    });
    ectx.send({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
  }
};
