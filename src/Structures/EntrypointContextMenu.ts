import {
  type ApplicationCommandData,
  ApplicationCommandType,
  type GuildMember,
  type Interaction,
  type Message,
  type MessageContextMenuCommandInteraction,
  type UserContextMenuCommandInteraction,
} from "discord.js";
import { CommandError } from "../Configuration/definitions";
import type { BotLogger } from "../Helpers/logging/evlog";
import { ApplicationData, ContextMenus } from "./data";
import { InteractionEntrypoint } from "./EntrypointBase";

export type TargetTypes = {
  [ApplicationCommandType.Message]: Message;
  [ApplicationCommandType.User]: GuildMember;
};

export type ContextMenuInteraction = (MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction) & {
  log: BotLogger;
};

export type ContextMenuHandler<T extends keyof TargetTypes> = (
  ctx: ContextMenuInteraction,
  target: TargetTypes[T],
) => Promise<unknown>;

export abstract class ContextMenu<T extends keyof TargetTypes> extends InteractionEntrypoint<ContextMenuHandler<T>> {
  public commandData: ApplicationCommandData;

  static GenericContextType: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

  constructor(
    public name: string,
    type: T,
  ) {
    super();
    this.commandData = { type, name };
  }
  protected abstract getTarget(
    ctx: MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction,
  ): TargetTypes[T];

  async _run(ctx: Interaction, log: BotLogger): Promise<void> {
    if (!ctx.isContextMenuCommand()) throw new CommandError("Not a context menu");

    const contextCtx = ctx as ContextMenuInteraction;
    contextCtx.log = log;
    const target = this.getTarget(ctx);
    await this.handler(contextCtx, target);
  }

  _register(): string {
    ApplicationData.push(this.commandData);

    ContextMenus.set(this.name, this as unknown as ContextMenu<keyof TargetTypes>);
    return this.name;
  }
}

export class UserContextMenu extends ContextMenu<ApplicationCommandType.User> {
  constructor(name: string) {
    super(name, ApplicationCommandType.User);
  }

  getTarget(ctx: UserContextMenuCommandInteraction) {
    const member = ctx.options.getMember("user");
    if (!member) throw new CommandError("Failed to get member");
    return member as GuildMember;
  }
}

export class MessageContextMenu extends ContextMenu<ApplicationCommandType.Message> {
  constructor(name: string) {
    super(name, ApplicationCommandType.Message);
  }

  getTarget(ctx: MessageContextMenuCommandInteraction) {
    const msg = ctx.options.getMessage("message", false);
    if (!msg) throw new CommandError("Failed to get message");
    return msg as Message;
  }
}
