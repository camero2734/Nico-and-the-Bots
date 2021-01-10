/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import * as chalk from "chalk";
import {
    DMChannel,
    Guild,
    GuildMember,
    Message,
    MessageEmbed,
    MessageReaction,
    Snowflake,
    TextChannel,
    User
} from "discord.js";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";
import { prefix } from "./config";

export class CommandError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info" | "Roles" | "Social";

export interface CommandMessage<T = unknown> extends Message {
    // The command used (no prefix)
    command: string;
    // All arguments (excluding command) in an array
    args: string[];
    // All arguments (excluding command) as a string
    argsString: string;
    // Optional props, mostly used for commands calling other commands
    props: T;

    // This is required, unlike Message itself
    member: GuildMember;
    // This is required, unlike Message itself
    guild: Guild;
    // Narrow channel typedef
    channel: TextChannel;
}
interface ICommandBase<T = unknown> {
    name: string;
    description: string;
    category: CommandCategory;
    usage: string;
    example: string;
    aliases?: string[];
    prereqs?: Array<(msg: Message, member?: GuildMember) => boolean>;
    cmd: (msg: CommandMessage<T>, connection: Connection) => Promise<void>;

    // Determines whether a message/reaction is in response to this command
    interactiveFilter?: (msg: Message, reaction?: MessageReaction, reactionUser?: User) => Promise<boolean>;
    // Handler for that interactive message
    interactiveHandler?: (
        msg: Message,
        connection: Connection,
        reaction?: MessageReaction,
        reactionUser?: User
    ) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type ICommand<T = unknown, U = void> = ICommandBase<T> & (U extends void ? {} : { persistent: U });

export class Command<T = unknown, U = void> implements ICommandBase<T> {
    // Maintain reference to all other commands
    private static commands: Command[];

    public name: string;
    public description: string;
    public category: CommandCategory;
    public usage: string;
    public example: string;
    public persistent: NonNullable<U>;
    public aliases: string[];
    public prereqs: Array<(msg: Message, member?: GuildMember) => boolean>;
    public cmd: (msg: CommandMessage<T>, connection: Connection) => Promise<void>;

    // Determines whether a message/reaction is in response to this command
    public interactiveFilter?: (msg: Message, reaction?: MessageReaction, reactionUser?: User) => Promise<boolean>;
    // Handler for that interactive message
    public interactiveHandler?: (
        msg: Message,
        connection: Connection,
        reaction?: MessageReaction,
        reactionUser?: User
    ) => Promise<void>;

    constructor(opts: ICommand<T, U>) {
        this.prereqs = opts.prereqs || [];
        this.aliases = opts.aliases || [];
        Object.assign(this, opts);
    }

    async execute(msg: Message, connection: Connection, props: T): Promise<boolean> {
        const args = msg.content.split(" ");
        const cmd = args.shift()?.substring(prefix.length) || ""; // Remove command
        const argsString = args.join(" ");

        const cmsg = msg as CommandMessage<T>;
        cmsg.args = args;
        cmsg.argsString = argsString;
        cmsg.command = cmd;
        cmsg.props = props;

        this.logToConsole(cmsg);

        try {
            const passes = this.checkPrereqs(cmsg, cmsg.member);
            if (!passes) throw new CommandError("You do not have permission to use this command");
            await this.cmd(cmsg, connection);
            return true;
        } catch (e) {
            const channel = msg.channel as TextChannel;
            if (e instanceof CommandError) await this.sendHelp(channel, e.message);
            else {
                console.log("Uncaught Error in Command: ", e);
                await channel.send(
                    MessageTools.textEmbed(
                        `I encountered an error in \`${prefix}${cmsg.command}\`. It's not your fault.`
                    )
                );
            }
            return false;
        }
    }

    async sendHelp(channel: TextChannel, text?: string): Promise<void> {
        const embed = new MessageEmbed();

        if (text) {
            embed.setTitle("Error!");
            embed.setDescription(`**${text}**\n\nHere's some help on how to use this command:`);
        } else embed.setTitle(this.name);
        embed.addField("Description", this.description);
        embed.addField("Usage", this.usage);
        embed.addField("Example", this.example);
        embed.setFooter("[] = required, () = optional");

        await channel.send(embed);
    }

    checkPrereqs(msg: Message, member: GuildMember): boolean {
        for (const passes of this.prereqs) {
            if (!passes(msg, member)) return false;
        }
        return true;
    }

    logToConsole(cmsg: CommandMessage): void {
        const { red, gray, yellow } = chalk;
        console.log(red(`!${cmsg.command}`) + ":");
        console.log(`\t${gray("Args:")} ${yellow(`[${cmsg.args}]`)}`);
        console.log(`\t${gray("From:")} ${yellow(cmsg.author.username)}`);
        console.log(`\t${gray("In:")} ${yellow((cmsg.channel as TextChannel).name)}`);
    }

    static setCommands(commands: Command[]): void {
        this.commands = commands;
    }

    static findCommand(msg: Message): Command | undefined {
        console.log("\tprefix?");
        if (msg.content.startsWith(prefix)) {
            console.log("\tit does");
            const commandName = msg.content.split(" ")[0].substring(prefix.length).toLowerCase();
            console.log(`\tname: ${commandName}`);
            const command = this.commands.find((c) => {
                if (c.name === commandName) return true;
                else return c.aliases.some((a) => a === commandName);
            });
            return command;
        }
    }

    static async runCommand<T>(msg: Message, connection: Connection, props: T = {} as T): Promise<void> {
        const command = this.findCommand(msg);
        if (!command) throw new Error("Unable to find command");

        await command.execute(msg, connection, props);
    }
}

export interface WarningData {
    edited: boolean;
    given: Snowflake;
    channel: Snowflake;
    rule?: string;
    severity: number;
    content: string;
}

declare module "discord.js" {
    interface TextChannel {
        embed(text: string, color?: string): Promise<Message>;
    }
    interface DMChannel {
        embed(text: string, color?: string): Promise<Message>;
    }
}

TextChannel.prototype.embed = function (text: string, color?: string) {
    const msg = this.send(MessageTools.textEmbed(text, color));
    return msg;
};

DMChannel.prototype.embed = TextChannel.prototype.embed;
