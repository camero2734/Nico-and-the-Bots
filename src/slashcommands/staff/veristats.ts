import { CommandOptions, CommandRunner } from "configuration/definitions";
import { Poll } from "database/entities/Poll";
import { MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import F from "helpers/funcs";
import { Question } from "helpers/verified-quiz/question";
import fetch from "node-fetch";
import R from "ramda";
import { CommandOptionType } from "slash-create";
import QuizQuestions from "../../helpers/verified-quiz/quiz";
import progressBar from "string-progressbar";

export const Options: CommandOptions = {
    description: "Shows stats about verified questions",
    options: [
        {
            name: "stat",
            description: "The stat to display",
            required: false,
            type: CommandOptionType.STRING,
            choices: [
                { name: "Hardest Questions", value: "hardest" },
                { name: "Easiest Questions", value: "easiest" }
            ]
        }
    ]
};

export const Executor: CommandRunner<{ stat: "hardest" | "easiest" }> = async (ctx) => {
    await ctx.defer();
    const stats = await ctx.connection.getMongoRepository(Poll).find({ where: { identifier: { $regex: /^VFQZ/ } } });

    const partitionByCorrectness = R.partition((vote: Poll["votes"][number]): boolean => vote.index === 0);

    const fullStats = stats.map((stat) => {
        const [correct, incorrect] = partitionByCorrectness(stat.votes);
        const questionID = Number(stat.identifier.replace(/VFQZ/, ""));

        const question = QuizQuestions.find((q) => q.id === questionID) as Question;

        return {
            correct: correct.length,
            incorrect: incorrect.length,
            total: stat.votes.length,
            percent: correct.length / stat.votes.length,
            stat,
            question
        };
    });

    const sortedStats = fullStats.sort((a, b) => a.percent - b.percent);
    if (ctx.opts.stat === "easiest") sortedStats.reverse();

    const topSortedStats = sortedStats.filter((s) => s.question).slice(0, 10);

    const embed = new MessageEmbed().setTitle(`${F.titleCase(ctx.opts.stat)} Verified Quiz Questions`);

    for (const stat of topSortedStats) {
        const questionName = stat.question.question.split("\n")[0];
        const [progress] = progressBar.filledBar(stat.total, stat.correct, 20);
        embed.addField(questionName, `${progress} [${stat.correct}/${stat.total}]`);
    }

    await ctx.send({ embeds: [embed.toJSON()] });
};
