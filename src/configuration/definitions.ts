/* eslint-disable @typescript-eslint/ban-types */
/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import { Client, MessageEmbed } from "discord.js";
import { CommandContext, Message, SlashCommand, SlashCommandOptions, SlashCreator } from "slash-create";
import { Connection } from "typeorm";



export class CommandError extends Error {}
export class InteractiveError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info" | "Roles" | "Social" | "Utility";

// export interface Reaction {
//     data: MessageReaction;
//     user: User;
//     added: boolean;
// }

export type CommandRunner = (ctx: ExtendedContext, clientConnection: {client: Client, connection: Connection}) => ReturnType<SlashCommand["run"]>;
export type SubcommandRunner<U extends string = string> = Record<U, CommandRunner>;
export type GeneralCommandRunner = CommandRunner | SubcommandRunner;
export type CommandOptions = Pick<SlashCommandOptions, "options"> & {
    description: string;
};

export type ExtendedContext = CommandContext & {
    embed(discordEmbed: MessageEmbed): Promise<Message | boolean>
};

function extendContext(ctx: CommandContext): ExtendedContext {
    const extendedContext = ctx as ExtendedContext;
    extendedContext.embed = (discordEmbed: MessageEmbed): Promise<Message | boolean> => {
        return ctx.send({embeds: [discordEmbed.toJSON()]});
    }
    return extendedContext;
}

export class Command<Q extends GeneralCommandRunner = CommandRunner> extends SlashCommand {
    private connection: Connection;
    private client: Client;
    constructor(creator: SlashCreator, commandName: string, options: CommandOptions, filePath: string, private executor: Q) {
        super(creator, {name: commandName, ...options, guildIDs: ["269657133673349120"]});
        this.filePath = filePath;
    }
    setConnectionClient(connection: Connection, client: Client): void {
        this.connection = connection;
        this.client = client;
    }
    hasNoSubCommands(): this is Command<CommandRunner> {
        return typeof this.executor === "function";
    }
    run(ctx: CommandContext): ReturnType<SlashCommand["run"]> {
        const ectx = extendContext(ctx);

        if (this.hasNoSubCommands()) return this.executor(ectx, {client: this.client, connection: this.connection});
        const [subcommand] = ctx.subcommands || [];
        const executor = this.executor as SubcommandRunner;

        if (!subcommand) return executor.default(ectx, {client: this.client, connection: this.connection});
        else return executor[subcommand](ectx, {client: this.client, connection: this.connection});
    }
}

// interface CommandData<T = unknown> {
//     // The command used (no prefix)
//     command: string;
//     // Optional props, mostly used for commands calling other commands
//     props: T;
// }

// export class CommandMessage<T = unknown> extends Message {
//     // The command used (no prefix)
//     public command: string;
//     // Optional props, mostly used for commands calling other commands
//     public props: T;

//     // This is required, unlike Message itself
//     public member: GuildMember;
//     // This is required, unlike Message itself
//     public guild: Guild;
//     // Narrow channel typedef
//     public channel: TextChannel;

//     addCommandData(data: CommandData<T>): void {
//         this.command = data.command;
//         this.props = data.props;
//     }

//     get args(): string[] {
//         return this.content.split(" ").slice(1);
//     }

//     get argsString(): string {
//         return this.args.join(" ");
//     }
// }

// Structures.extend("Message", () => CommandMessage);

// interface ICommandBase<T = unknown> {
//     name: string;
//     description: string;
//     category: CommandCategory;
//     usage: string;
//     example: string;
//     interactive?: (msg: CommandMessage, connection: Connection, reaction: Reaction) => Promise<void>;
//     aliases?: string[];
//     prereqs?: Array<(msg: CommandMessage, member?: GuildMember) => boolean>;
//     cmd: (msg: CommandMessage<T>, connection: Connection) => Promise<void>;
// }

// type ICommand<T = unknown, U = void> = ICommandBase<T> & (U extends void ? {} : { persistent: U });

// export class Command<T = unknown, U = void> implements ICommandBase<T> {
//     // Maintain reference to all other commands
//     private static commands: Command[];

//     public name: string;
//     public description: string;
//     public category: CommandCategory;
//     public usage: string;
//     public example: string;
//     public persistent: NonNullable<U>;
//     public aliases: string[];
//     public prereqs: Array<(msg: CommandMessage, member?: GuildMember) => boolean>;
//     public cmd: (msg: CommandMessage<T>, connection: Connection) => Promise<void>;

//     public interactive?: (msg: CommandMessage, connection: Connection, reaction?: Reaction) => Promise<void>;

//     constructor(opts: ICommand<T, U>) {
//         this.prereqs = opts.prereqs || [];
//         this.aliases = opts.aliases || [];
//         Object.assign(this, opts);
//     }

//     async execute(msg: CommandMessage<T>, connection: Connection, props: T): Promise<boolean> {
//         const args = msg.content.split(" ");
//         const cmd = args.shift()?.substring(prefix.length) || ""; // Remove command
//         const argsString = args.join(" ");

//         msg.addCommandData({ command: cmd, props });

//         this.logToConsole(msg);

//         try {
//             const passes = this.checkPrereqs(msg, msg.member);
//             if (!passes) throw new CommandError("You do not have permission to use this command");
//             await this.cmd(msg, connection);
//             return true;
//         } catch (e) {
//             const channel = msg.channel as TextChannel;
//             if (e instanceof CommandError) await this.sendHelp(channel, e.message);
//             else {
//                 console.log("Uncaught Error in Command: ", e);
//                 await channel.send(
//                     MessageTools.textEmbed(
//                         `I encountered an error in \`${prefix}${msg.command}\`. It's not your fault.`
//                     )
//                 );
//             }
//             return false;
//         }
//     }

//     async sendHelp(channel: TextChannel, text?: string): Promise<void> {
//         const embed = new MessageEmbed();

//         if (text) {
//             embed.setTitle("Error!");
//             embed.setDescription(`**${text}**\n\nHere's some help on how to use this command:`);
//         } else embed.setTitle(this.name);
//         embed.addField("Description", this.description);
//         embed.addField("Usage", this.usage);
//         embed.addField("Example", this.example);
//         embed.setFooter("[] = required, () = optional");

//         await channel.send(embed);
//     }

//     checkPrereqs(msg: CommandMessage, member: GuildMember): boolean {
//         for (const passes of this.prereqs) {
//             if (!passes(msg, member)) return false;
//         }
//         return true;
//     }

//     logToConsole(cmsg: CommandMessage): void {
//         const { red, gray, yellow } = chalk;
//         console.log(red(`!${cmsg.command}`) + ":");
//         console.log(`\t${gray("Args:")} ${yellow(`[${cmsg.args}]`)}`);
//         console.log(`\t${gray("From:")} ${yellow(cmsg.author.username)}`);
//         console.log(`\t${gray("In:")} ${yellow((cmsg.channel as TextChannel).name)}`);
//     }

//     static setCommands(commands: Command[]): void {
//         this.commands = commands;
//     }

//     static findCommandFromMessage(msg: CommandMessage): Command | undefined {
//         console.log("\tprefix?");
//         if (msg.content.startsWith(prefix)) {
//             console.log("\tit does");
//             const commandName = msg.content.split(" ")[0].substring(prefix.length).toLowerCase();
//             console.log(`\tname: ${commandName}`);
//             const command = this.findCommandFromName(commandName);
//             return command;
//         }
//     }

//     static findCommandFromName(name: string): Command | undefined {
//         return this.commands.find((c) => {
//             if (c.name === name) return true;
//             else return c.aliases.some((a) => a === name);
//         });
//     }

//     static async runCommand<T>(msg: CommandMessage, connection: Connection, props: T = {} as T): Promise<void> {
//         const command = this.findCommandFromMessage(msg);
//         if (!command) throw new Error("Unable to find command");

//         await command.execute(msg, connection, props);
//     }
// }

// export interface WarningData {
//     edited: boolean;
//     given: Snowflake;
//     channel: Snowflake;
//     rule?: string;
//     severity: number;
//     content: string;
// }

// declare module "discord.js" {
//     interface TextChannel {
//         embed(text: string, color?: string): Promise<Message>;
//     }
//     interface DMChannel {
//         embed(text: string, color?: string): Promise<Message>;
//     }
// }

// TextChannel.prototype.embed = function (text: string, color?: string) {
//     const msg = this.send(MessageTools.textEmbed(text, color));
//     return msg;
// };

// DMChannel.prototype.embed = TextChannel.prototype.embed;
