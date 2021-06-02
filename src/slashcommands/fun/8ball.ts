import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Dusts off the old 8-ball and gives you an answer to your most burning yes/no questions",
    options: [
        { name: "question", description: "What you want to ask Nico", required: true, type: CommandOptionType.STRING }
    ]
};

export const Executor: CommandRunner<{ question: string }> = async (ctx) => {
    await ctx.defer();
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

    const embed = new MessageEmbed();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    embed.setAuthor(ctx.member?.displayName, ctx.user.dynamicAvatarURL("png"));
    embed.setTitle(ctx.opts.question);
    embed.setDescription(`**The Wise Nico Says:** ${response}`);

    await ctx.embed(embed);
};
