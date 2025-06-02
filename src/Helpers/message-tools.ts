import {
  ActionRowBuilder,
  type BaseMessageOptions,
  ButtonBuilder,
  type ButtonComponent,
  Collection,
  EmbedBuilder,
  type GuildMember,
  type Message,
  type MessageActionRowComponentBuilder,
  type Snowflake,
  type TextChannel,
} from "discord.js";
import { constants } from "../Configuration/config";

export function strEmbed(strings: TemplateStringsArray, color?: number): EmbedBuilder {
  const baseEmbed = new EmbedBuilder().setDescription(strings.join(""));
  if (color) baseEmbed.setColor(color);
  return baseEmbed;
}

interface IAllocateButtonsOptions {
  maxButtonsPerRow?: number;
}

export const MessageTools = {
  async awaitMessage(userID: string, channel: TextChannel, timeMS: number): Promise<Message | null> {
    const filter = (m: Message) => m.author.id === userID;
    try {
      const collected = await channel.awaitMessages({
        filter,
        max: 1,
        time: timeMS,
        errors: ["time"],
      });
      const awaitedMessage = collected.first();

      return awaitedMessage || null;
    } catch (e) {
      return null;
    }
  },

  /** Takes an array of buttons and places them into an array of Action Row components */
  allocateButtonsIntoRows(
    buttons: (ButtonComponent | ButtonBuilder)[],
    options?: IAllocateButtonsOptions,
  ): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
    const components = [] as ActionRowBuilder<MessageActionRowComponentBuilder>[];

    const maxButtonsPerRow = options?.maxButtonsPerRow ?? constants.ACTION_ROW_MAX_ITEMS;

    if (buttons.length > maxButtonsPerRow * constants.MAX_ACTION_ROWS) throw new Error("Too many buttons");

    for (let i = 0; i < buttons.length; i += maxButtonsPerRow) {
      const slicedButtons = buttons.slice(i, i + maxButtonsPerRow).map((b) => ButtonBuilder.from(b));
      const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(slicedButtons);
      components.push(actionRow);
    }

    return components;
  },

  async fetchAllMessages(
    channel: TextChannel,
    num = Number.POSITIVE_INFINITY,
  ): Promise<Collection<Snowflake, Message>> {
    const MAX_MESSAGES_FETCH = 100;
    let before: Snowflake | undefined = undefined;

    let allMessages: Collection<Snowflake, Message> = new Collection();

    while (allMessages.size < num) {
      const previousSize = allMessages.size;
      const msgs: Collection<Snowflake, Message> = await channel.messages.fetch({ limit: MAX_MESSAGES_FETCH, before });
      allMessages = allMessages.concat(msgs);

      if (allMessages.size === previousSize) break; // No new messages

      before = msgs.last()?.id;
    }

    return allMessages;
  },

  async safeDM(member: GuildMember, msg: BaseMessageOptions): Promise<boolean> {
    try {
      const dm = await member.createDM();
      await dm.send(msg);
      return true;
    } catch (e) {
      return false;
    }
  },
};
