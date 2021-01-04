/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import { Guild, GuildMember, Message, MessageEmbed, MessageReaction, TextChannel, User } from "discord.js";
import { Connection } from "typeorm";
import * as chalk from "chalk";
import { prefix } from "./config";
import { MessageTools } from "helpers";

export class CommandError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info" | "Roles" | "Social";

export interface CommandMessage extends Message {
    // The command used (no prefix)
    command: string;
    // All arguments (excluding command) in an array
    args: string[];
    // All arguments (excluding command) as a string
    argsString: string;
    // This is required, unlike Message itself
    member: GuildMember;
    // This is required, unlike Message itself
    guild: Guild;
}
interface ICommand {
    name: string;
    description: string;
    category: CommandCategory;
    usage: string;
    example: string;
    aliases?: string[];
    prereqs?: Array<(msg: Message, member?: GuildMember) => boolean>;
    cmd: (msg: CommandMessage, connection: Connection) => Promise<void>;

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

export class Command implements ICommand {
    // Maintain reference to all other commands
    private static commands: Command[];

    public name: string;
    public description: string;
    public category: CommandCategory;
    public usage: string;
    public example: string;
    public aliases: string[];
    public prereqs: Array<(msg: Message, member?: GuildMember) => boolean>;
    public cmd: (msg: CommandMessage, connection: Connection) => Promise<void>;

    // Determines whether a message/reaction is in response to this command
    public interactiveFilter?: (msg: Message, reaction?: MessageReaction, reactionUser?: User) => Promise<boolean>;
    // Handler for that interactive message
    public interactiveHandler?: (
        msg: Message,
        connection: Connection,
        reaction?: MessageReaction,
        reactionUser?: User
    ) => Promise<void>;

    constructor(opts: ICommand) {
        this.prereqs = opts.prereqs || [];
        this.aliases = opts.aliases || [];
        Object.assign(this, opts);
    }

    async execute(msg: Message, connection: Connection): Promise<boolean> {
        const args = msg.content.split(" ");
        const cmd = args.shift()?.substring(prefix.length) || ""; // Remove command
        const argsString = args.join(" ");

        const cmsg = msg as CommandMessage;
        cmsg.args = args;
        cmsg.argsString = argsString;
        cmsg.command = cmd;

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
        if (msg.content.startsWith(prefix)) {
            const commandName = msg.content.split(" ")[0].substring(prefix.length).toLowerCase();
            const command = this.commands.find((c) => {
                if (c.name === commandName) return true;
                else return c.aliases.some((a) => a === commandName);
            });
            return command;
        }
    }

    static async runCommand(msg: Message, connection: Connection): Promise<void> {
        const command = this.findCommand(msg);
        if (!command) throw new Error("Unable to find command");

        await command.execute(msg, connection);
    }
}
