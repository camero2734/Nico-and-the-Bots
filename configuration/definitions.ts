import { Message, MessageEmbed, TextChannel } from "discord.js";

export class CommandError extends Error {}

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info";

interface ICommand {
    name: string;
    description: string;
    category: CommandCategory;
    usage: string;
    example: string;
    cmd: (msg: Message, args: string[], argsString: string) => Promise<void>;
}

export class Command implements ICommand {
    public name: string;
    public description: string;
    public category: CommandCategory;
    public usage: string;
    public example: string;
    public cmd: (msg: Message, args: string[], argsString: string) => Promise<void>;
    constructor(opts: ICommand) {
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
            if (typeof e !== typeof CommandError) {
                console.log("Uncaught Error in Command: ", e);
            } else await this.sendHelp(msg.channel as TextChannel, e.message);
            return false;
        }
    }

    async sendHelp(channel: TextChannel, text?: string): Promise<void> {
        const embed = new MessageEmbed();
        embed.setTitle(this.name);
        if (text) {
            embed.setDescription(text);
            embed.addField("\u200b", "\u200b");
        }
        embed.addField("Description", this.description);
        embed.addField("Usage", this.usage);
        embed.addField("Example", this.example);
        embed.setFooter("[] = required, () = optional");

        await channel.send(embed);
    }
}
