import { MessageEmbed } from "discord.js";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Dusts off the old 8-ball and gives you an answer to your most burning yes/no questions",
    options: [{ name: "question", description: "What you want to ask Nico", required: true, type: "STRING" }]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();
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

    await F.wait(2000);

    embed.setAuthor(ctx.member?.displayName, ctx.user.displayAvatarURL());
    embed.setTitle(ctx.opts.question);
    embed.setDescription(`**The Wise Nico Says:** ${response}`);

    await ctx.send({ embeds: [embed] });
});

export default command;
