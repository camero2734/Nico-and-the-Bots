/* eslint-disable @typescript-eslint/ban-types */
/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import { Client, DiscordAPIError, MessageEmbed, TextChannel } from "discord.js";
import {
    CommandContext,
    ConvertedOption,
    Message,
    SlashCommand,
    SlashCommandOptions,
    SlashCreator
} from "slash-create";
import { Connection } from "typeorm";

export class CommandError extends Error {}
export class InteractiveError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info" | "Roles" | "Social" | "Utility";

export interface CommandOption {
    [key: string]: ConvertedOption;
}
export type CommandRunner<T extends CommandOption> = (ctx: ExtendedContext<T>) => ReturnType<SlashCommand["run"]>;
export type SubcommandRunner<T extends CommandOption, U extends string = string> = Record<U, CommandRunner<T>>;
export type GeneralCommandRunner<T extends CommandOption> = CommandRunner<T> | SubcommandRunner<T>;
export type CommandOptions = Pick<SlashCommandOptions, "options"> & {
    description: string;
};

export type ExtendedContext<T extends CommandOption = {}> = Omit<CommandContext, "options"> & {
    embed(discordEmbed: MessageEmbed, includeSource?: boolean): Promise<Message | boolean>;
    channel: TextChannel;
    opts: T;
    client: Client;
    connection: Connection;
    isExtended: boolean;
};

function extendContext<T extends CommandOption>(
    ctx: CommandContext,
    client: Client,
    connection: Connection
): ExtendedContext<T> {
    const extendedContext = (ctx as unknown) as ExtendedContext<T>;
    extendedContext.embed = (discordEmbed: MessageEmbed, includeSource = false): Promise<Message | boolean> => {
        return ctx.send({ embeds: [discordEmbed.toJSON()], includeSource });
    };

    extendedContext.isExtended = true;

    extendedContext.channel = client.guilds.cache
        .get(ctx.guildID + "")
        ?.channels.cache.get(ctx.channelID) as TextChannel;
    if (!extendedContext) throw new Error("Unable to extend context");

    extendedContext.client = client;
    extendedContext.connection = connection;
    extendedContext.opts = ctx.options[extendedContext.subcommands[0]] as T;
    return extendedContext;
}

const ErrorHandler = (e: Error, ectx: ExtendedContext): void => {
    if (!ectx.isExtended) {
        console.log(e);
        return;
    }

    if (e instanceof CommandError) {
        const embed = new MessageEmbed()
            .setDescription(`\`\`\`cpp\n${e.message}\n\`\`\``)
            .setTitle("An error occurred!")
            .setFooter("DEMA internet broke");
        ectx.embed(embed, true);
    } else {
        console.log(e);
        const embed = new MessageEmbed().setTitle("An unknown error occurred!").setFooter("DEMA internet really broke");
        ectx.embed(embed, true);
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
        private executor: Q
    ) {
        super(creator, { name: commandName, ...options, guildIDs: ["269657133673349120"] });
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
        let ectx = (null as unknown) as ExtendedContext<T>;
        try {
            ectx = extendContext<T>(ctx, this.client, this.connection);

            if (this.hasNoSubCommands()) return this.executor(ectx);

            const [subcommand] = ctx.subcommands || [];
            const executor = this.executor as SubcommandRunner<T>;

            if (!subcommand) return executor.default(ectx);
            else return executor[subcommand](ectx);
        } catch (e) {
            ErrorHandler(e, ectx || ctx);
        }
    }
}
