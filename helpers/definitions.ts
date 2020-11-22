import {
    DiscordAPIError,
    Message,
    MessageEmbed,
    TextChannel
} from "discord.js";

export type CommandCategory = "Staff" | "Games" | "Economy" | "Info";

export class Command {
    constructor(
        public name: string,
        public description: string,
        public category: CommandCategory,
        public usage: string,
        public example: string,
        public cmd: (args: string[], argsString: string) => Promise<boolean>
    ) {}

    async execute(msg: Message) {
        const args = msg.content.split(" ");
        args.shift(); // Remove command
        const argsString = args.join(" ");

        const success = await this.cmd(args, argsString);
        if (!success) return this.sendHelp(msg.channel as TextChannel);
    }

    async sendHelp(channel: TextChannel) {
        const embed = new MessageEmbed();
        embed.setTitle(this.name);
        embed.addField("Description", this.description);
        embed.addField("Usage", this.usage);
        embed.addField("Example", this.example);
        embed.setFooter("[] = required, () = optional");

        await channel.send(embed);
    }
}
