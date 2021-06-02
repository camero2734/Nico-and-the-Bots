/* eslint-disable @typescript-eslint/ban-types */
/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import { Client, GuildMember, MessageAttachment, MessageEmbed, MessageReaction, TextChannel, User } from "discord.js";
import {
    ApplicationCommandPermissionType,
    CommandContext,
    Message,
    SlashCommand,
    SlashCommandOptions,
    SlashCreator
} from "slash-create";
import { Connection } from "typeorm";
import { channelIDs, guildID, roles } from "./config";

export class CommandError extends Error {
    constructor(message?: string, public sendEphemeral = false) {
        super(message);
    }
}

export class InteractiveError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info" | "Roles" | "Social" | "Utility";

export interface CommandOption {
    [key: string]: string | number | boolean;
}
export type CommandRunner<T extends CommandOption = {}> = (ctx: ExtendedContext<T>) => ReturnType<SlashCommand["run"]>;
export type SubcommandRunner<T extends CommandOption = {}, U extends string = string> = Record<U, CommandRunner<T>>;
export type GeneralCommandRunner<T extends CommandOption = {}> = CommandRunner<T> | SubcommandRunner<T>;
export type CommandOptions = Pick<SlashCommandOptions, "options"> & {
    description: string;
    staffOnly?: boolean;
};

/**
 * @returns Boolean of whether this handler handled the reaction
 */
export type CommandReactionHandler = (args: {
    reaction: MessageReaction;
    user: User;
    connection: Connection;
}) => Promise<boolean>;

export type ExtendedContext<T extends CommandOption = {}> = Omit<CommandContext, "options" | "member"> & {
    embed(discordEmbed: MessageEmbed): Promise<Message | boolean>;
    acknowledge(): Promise<void>;
    channel: TextChannel;
    member: GuildMember;
    opts: T;
    client: Client;
    connection: Connection;
    isExtended: boolean;
};

async function extendContext<T extends CommandOption>(
    ctx: CommandContext,
    client: Client,
    connection: Connection
): Promise<ExtendedContext<T>> {
    const extendedContext = ctx as unknown as ExtendedContext<T>;
    extendedContext.embed = (embed: MessageEmbed): Promise<Message | boolean> => {
        if (extendedContext.deferred) return ctx.editOriginal({ embeds: [embed.toJSON()] });
        else if (embed.files) {
            const messageOptions = {
                embeds: [embed.toJSON()],
                file: (<MessageAttachment[]>embed.files).map((f) => ({
                    name: f.name as string,
                    file: f.attachment as Buffer
                }))
            };
            return ctx.sendFollowUp(messageOptions);
        }

        return ctx.send({ embeds: [embed.toJSON()] });
    };

    extendedContext.acknowledge = async () => {
        await extendedContext.embed(new MessageEmbed().setDescription("Command executed"));
    };

    extendedContext.isExtended = true;

    extendedContext.channel = client.guilds.cache
        .get(ctx.guildID + "")
        ?.channels.cache.get(ctx.channelID) as TextChannel;
    if (!extendedContext) throw new Error("Unable to extend context");

    extendedContext.member = await extendedContext.channel.guild.members.fetch(extendedContext.user.id);

    extendedContext.client = client;
    extendedContext.connection = connection;
    extendedContext.opts = (ctx.options[extendedContext.subcommands[0]] || ctx.options) as T;
    return extendedContext;
}

const ErrorHandler = (e: Error, ectx: ExtendedContext): void => {
    if (!ectx.isExtended) {
        console.log(e);
        return;
    }

    if (e instanceof CommandError) {
        const embed = new MessageEmbed()
            .setDescription(e.message)
            .setTitle("An error occurred!")
            .setFooter("DEMA internet broke");
        ectx.send({ embeds: [embed.toJSON()], ephemeral: e.sendEphemeral });
    } else {
        console.log(e);
        const embed = new MessageEmbed().setTitle("An unknown error occurred!").setFooter("DEMA internet really broke");
        ectx.embed(embed);
    }
};

export class Command<
    T extends CommandOption = {},
    Q extends GeneralCommandRunner<T> = CommandRunner<T>
> extends SlashCommand {
    private connection: Connection;
    private client: Client;
    constructor(
        creator: SlashCreator,
        commandName: string,
        options: CommandOptions,
        filePath: string,
        private executor: Q,
        public reactionHandler?: CommandReactionHandler
    ) {
        super(creator, {
            name: commandName,
            ...options,
            guildIDs: ["269657133673349120"],
            ...(commandName !== "Fix later" //commandName === "staff" || commandName === "shop"
                ? {
                      defaultPermission: false,
                      permissions: {
                          [guildID]: [
                              {
                                  type: ApplicationCommandPermissionType.ROLE,
                                  id: roles.staff,
                                  permission: true
                              }
                          ]
                      }
                  }
                : {
                      defaultPermission: true,
                      permissions: {
                          [guildID]: [
                              {
                                  type: ApplicationCommandPermissionType.ROLE,
                                  id: roles.banditos,
                                  permission: true
                              }
                          ]
                      }
                  })
        });
        this.filePath = filePath;
    }
    setConnectionClient(connection: Connection, client: Client): void {
        this.connection = connection;
        this.client = client;
    }
    hasNoSubCommands(): this is Command<T, CommandRunner<T>> {
        return typeof this.executor === "function";
    }
    async run(ctx: CommandContext): ReturnType<SlashCommand["run"]> {
        let ectx = null as unknown as ExtendedContext<T>;
        try {
            ectx = await extendContext<T>(ctx, this.client, this.connection);

            if (this.hasNoSubCommands()) return await this.executor(ectx);

            // Determine if command is valid in this channel

            // Only allow shop command in shop channel
            if (this.commandName !== "shop" && ectx.channel.id === channelIDs.shop) throw new CommandError(`Please use any non-shop commands in <#${channelIDs.commands}>`, true); // prettier-ignore
            if (this.commandName === "shop" && ectx.channel.id !== channelIDs.shop) throw new CommandError(`Please use shop commands in <#${channelIDs.shop}>`); // prettier-ignore

            const [subcommand] = ctx.subcommands || [];
            const executor = this.executor as SubcommandRunner<T>;

            if (!subcommand) return await executor.default(ectx);
            else return await executor[subcommand](ectx);
        } catch (e) {
            console.log("got error");
            ErrorHandler(e, ectx || ctx);
        }
    }
}

export interface WarningData {
    edited: boolean;
    given: string;
    channel: string;
    rule: string;
    severity: number;
    content: string;
}
