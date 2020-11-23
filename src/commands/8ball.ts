import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { TextChannel } from "discord.js";
import { MessageTools } from "helpers";

export default new Command({
    name: "8ball",
    description: "Nico will randomly shake his 1998 collectible Magic 8 Ball to give you an answer",
    category: "Games",
    usage: "!8ball [question]",
    example: "!8ball Is Clear the best song?",
    async cmd(msg: CommandMessage) {
        if (msg.args.length < 1) throw new CommandError("You didn't include a question!");
        const responses = [
            "Yes",
            "Most likely",
            "Outlook good",
            "Without a doubt",
            "Almost certainly",
            "Ask again later",
            "I don't know",
            "No",
            "Don't count on it",
            "Very doubtful",
            "This ain't it chief"
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];

        const embed = MessageTools.textEmbed("Thinking...");

        await MessageTools.timeMessages(msg.channel as TextChannel, [
            {
                content: embed,
                waitBefore: 0
            },
            {
                content: MessageTools.textEmbed(`**The Wise Nico Says:** ${response}`, embed.hexColor || undefined),
                waitBefore: 3000
            }
        ]);
    }
});
