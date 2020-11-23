/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import { Message, MessageEmbed, TextChannel } from "discord.js";
import { Connection } from "typeorm";
import * as chalk from "chalk";
import { prefix } from "./config";
import { MessageTools } from "helpers";

export class CommandError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info" | "Roles";

export interface CommandMessage extends Message {
    // The command used (no prefix)
    command: string;
    // All arguments (excluding command) in an array
    args: string[];
    // All arguments (excluding command) as a string
    argsString: string;
}

interface ICommand {
    name: string;
    description: string;
    category: CommandCategory;
    usage: string;
    example: string;
    aliases?: string[];
    prereqs?: Array<(msg: Message) => boolean>;
    cmd: (msg: CommandMessage, connection: Connection) => Promise<void>;
}

export class Command implements ICommand {
    public name: string;
    public description: string;
    public category: CommandCategory;
    public usage: string;
    public example: string;
    public aliases: string[];
    public prereqs: Array<(msg: Message) => boolean>;
    public cmd: (msg: CommandMessage, connection: Connection) => Promise<void>;

    constructor(opts: ICommand) {
        this.prereqs = opts.prereqs || [];
        this.aliases = opts.aliases || [];
        Object.assign(this, opts);
    }

    async execute(msg: Message, connection: Connection): Promise<boolean> {
        const args = msg.content.split(" ");
        const cmd = args.shift()?.substring(prefix.length); // Remove command
        const argsString = args.join(" ");

        const member = msg.member || (await msg.guild?.members.fetch(msg.author.id));
        const guild = msg.guild || member?.guild;

        const pMsg = {
            ...msg,
            args,
            argsString,
            command: cmd,
            member,
            guild
        } as CommandMessage;

        this.logToConsole(pMsg);

        try {
            await this.cmd(pMsg, connection);
            return true;
        } catch (e) {
            const channel = msg.channel as TextChannel;
            if (e instanceof CommandError) await this.sendHelp(channel, e.message);
            else {
                console.log("Uncaught Error in Command: ", e);
                await channel.send(
                    MessageTools.textEmbed(`I encountered an error in \`!${pMsg.command}\`. It's not your fault.`)
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

    logToConsole(pMsg: CommandMessage): void {
        const { red, gray, yellow } = chalk;
        console.log(red(`!${pMsg.command}`) + ":");
        console.log(`\t${gray("Args:")} ${yellow(`[${pMsg.args}]`)}`);
        console.log(`\t${gray("From:")} ${yellow(pMsg.author.username)}`);
        console.log(`\t${gray("In:")} ${yellow((pMsg.channel as TextChannel).name)}`);
    }
}
