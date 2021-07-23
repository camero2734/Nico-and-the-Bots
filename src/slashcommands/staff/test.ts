import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import { LevelCalculator } from "../../helpers";

export const Options = createOptions(<const>{
    description: "Test command",
    options: [
        {
            name: "user",
            description: "User",
            required: false,
            type: CommandOptionType.USER
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    // const start = Date.now();
    // const results = await queries.monthlyStats();
    // const time = Date.now() - start;

    // const user = results.find((r) => r.userId === ctx.opts.user);

    // if (!user) throw new CommandError("Error");
    // await ctx.send(`You are #${user.place} monthly, with a score of ${user.score} [${time}ms]`);

    const embed = new MessageEmbed().setTitle("Results");

    for (let i = 0; i < 20; i++) {
        const level = i === 0 ? 156 : Math.floor(Math.random() * 99) + 1;
        const score = LevelCalculator.calculateScore(level);
        const sameLevel = LevelCalculator.calculateLevel(score);
        embed.addField(`Level ${level}`, `${score} -> ${sameLevel}`);
    }

    await ctx.send({ embeds: [embed.toJSON()] });
};
