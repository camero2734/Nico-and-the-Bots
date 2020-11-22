/** DEFINITIONS.TS
 * Contains types, classes, interfaces, etc.
 */

import { Message, MessageEmbed, TextChannel } from "discord.js";

export class CommandError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info";

interface ICommand {
    name: string;
    description: string;
    category: CommandCategory;
    usage: string;
    example: string;
    prereqs?: Array<(msg: Message) => boolean>;
    cmd: (msg: Message, args: string[], argsString: string) => Promise<void>;
}

export class Command implements ICommand {
    public name: string;
    public description: string;
    public category: CommandCategory;
    public usage: string;
    public example: string;
    public prereqs: Array<(msg: Message) => boolean>;
    public cmd: (msg: Message, args: string[], argsString: string) => Promise<void>;
    constructor(opts: ICommand) {
        this.prereqs = opts.prereqs || [];
        Object.assign(this, opts);
    }

    async execute(msg: Message): Promise<boolean> {
        const args = msg.content.split(" ");
        args.shift(); // Remove command
        const argsString = args.join(" ");

        try {
            await this.cmd(msg, args, argsString);
            return true;
        } catch (e) {
            if (e instanceof CommandError) await this.sendHelp(msg.channel as TextChannel, e.message);
            else console.log("Uncaught Error in Command: ", e);
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
}
