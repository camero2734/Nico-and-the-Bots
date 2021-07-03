/* eslint-disable @typescript-eslint/ban-types */
/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import {
    Client,
    GuildMember,
    Interaction,
    MessageAttachment,
    MessageComponentInteraction,
    MessageEmbed,
    MessageReaction,
    Snowflake,
    TextChannel,
    User
} from "discord.js";
import F from "helpers/funcs";
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
    interactions: SlashCreator;
}) => Promise<boolean>;

export class CustomIDPattern<T extends Readonly<string[]>> {
    constructor(public args: T, public delimiter = ":") {}
    toDict(input: string): { [K in T[number]]: string } {
        const [name, ...parts] = input.split(this.delimiter);
        const dict = {} as { [K in T[number]]: string };
        for (let i = 0; i < parts.length; i++) {
            const key: T[number] = this.args[i];
            dict[key] = parts[i];
        }
        return dict;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class CommandComponentListener<T extends Readonly<string[]> = any> {
    pattern: CustomIDPattern<T>;
    name: string;
    constructor(
        name: string,
        patternArr: T,
        public handler: (
            interaction: MessageComponentInteraction,
            connection: Connection,
            args: ReturnType<CustomIDPattern<T>["toDict"]>
        ) => Promise<void> = async () => {
            return;
        }
    ) {
        this.pattern = new CustomIDPattern(patternArr);
        this.name = Buffer.from(name, "utf-8").toString("base64");
    }
    generateCustomID(args: ReturnType<CustomIDPattern<T>["toDict"]>): string {
        // Ensure order is preserved
        const ordered = F.entries(args).sort(([key1], [key2]) => this.pattern.args.indexOf(key1) - this.pattern.args.indexOf(key2)); // prettier-ignore
        const values = ordered.map((a) => a[1]);
        return [this.name, ...values].join(this.pattern.delimiter);
    }
}

export type ExtendedContext<T extends CommandOption = {}> = Omit<
    CommandContext,
    "options" | "member" | "guildID" | "channelID"
> & {
    embed(discordEmbed: MessageEmbed): Promise<Message | boolean>;
    acknowledge(): Promise<void>;
    runCommand<T extends CommandOption>(executor: CommandRunner<T>, opts: T): Promise<void>;
    guildID: Snowflake;
    channelID: Snowflake;
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

        return ctx.send({ embeds: [embed.toJSON()] });
    };

    extendedContext.acknowledge = async () => {
        await extendedContext.embed(new MessageEmbed().setDescription("Command executed"));
    };

    extendedContext.isExtended = true;

    extendedContext.channel = client.guilds.cache
        .get(ctx.guildID as Snowflake)
        ?.channels.cache.get(ctx.channelID as Snowflake) as TextChannel;
    if (!extendedContext) throw new Error("Unable to extend context");

    extendedContext.member = await extendedContext.channel.guild.members.fetch(extendedContext.user.id as Snowflake);

    extendedContext.client = client;
    extendedContext.connection = connection;
    extendedContext.opts = (ctx.options[extendedContext.subcommands[0]] || ctx.options) as T;

    extendedContext.runCommand = async (executor, opts) => {
        {
            const newCtx = { ...extendedContext, opts };
            return await executor(newCtx);
        }
    };

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
            .setFooter("DEMA internet machine broke");
        ectx.send({
            embeds: [embed.toJSON()],
            ephemeral: e.sendEphemeral,
            allowedMentions: { users: [], everyone: false, roles: [] }
        });
    } else {
        console.log(e);
        const embed = new MessageEmbed()
            .setTitle("An unknown error occurred!")
            .setFooter("DEMA internet machine really broke");
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
            guildIDs: ["269657133673349120"],
            ...options,
            ...determineCommandPermissions(commandName)
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
    override async run(ctx: CommandContext): ReturnType<SlashCommand["run"]> {
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
            ErrorHandler(e as Error, ectx || ctx);
        }
    }
}

function determineCommandPermissions(commandName: string): Partial<SlashCommandOptions> {
    if (commandName === "staff" || (commandName !== "roles" && commandName !== "apply"))
        return {
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
        };
    else
        return {
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
        };
}

export interface WarningData {
    edited: boolean;
    given: string;
    channel: string;
    rule: string;
    severity: number;
    content: string;
}
