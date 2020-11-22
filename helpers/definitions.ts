import { Message, MessageEmbed, TextChannel } from "discord.js";

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info";

interface ICommand {
    name: string;
    description: string;
    category: CommandCategory;
    usage: string;
    example: string;
    cmd: (args: string[], argsString: string) => Promise<boolean>;
}

export class Command implements ICommand {
    public name: string;
    public description: string;
    public category: CommandCategory;
    public usage: string;
    public example: string;
    public cmd: (args: string[], argsString: string) => Promise<boolean>;
    constructor(opts: ICommand) {
        Object.assign(this, opts);
    }

    async execute(msg: Message): Promise<boolean> {
        const args = msg.content.split(" ");
        args.shift(); // Remove command
        const argsString = args.join(" ");

        const success = await this.cmd(args, argsString);
        if (!success) await this.sendHelp(msg.channel as TextChannel);
        return success;
    }

    async sendHelp(channel: TextChannel): Promise<void> {
        const embed = new MessageEmbed();
        embed.setTitle(this.name);
        embed.addField("Description", this.description);
        embed.addField("Usage", this.usage);
        embed.addField("Example", this.example);
        embed.setFooter("[] = required, () = optional");

        await channel.send(embed);
    }
}
