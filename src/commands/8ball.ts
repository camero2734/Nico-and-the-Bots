import { Message, MessageEmbed } from "discord.js";
import { Command, CommandError } from "configuration/definitions";

export default new Command({
    name: "8ball",
    description: "Nico will randomly shake his 1998 collectible Magic 8 Ball to give you an answer",
    category: "Games",
    usage: "!8ball [question]",
    example: "!8ball Is Clear the best song?",
    async cmd(msg: Message, args: string[]) {
        if (args.length < 1) throw new CommandError("You didn't include a question!");
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

        await msg.channel.send(response);
    }
});
