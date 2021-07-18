import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import wiki from "wikijs";
import { Tag } from "../../database/entities/Tag";
import F from "../../helpers/funcs";

export const Options = createOptions(<const>{
    description: "Grabs the summary of something from Wikipedia",
    options: [{ name: "search", description: "The term to search for", required: true, type: CommandOptionType.STRING }]
});

const wikipediaLogo =
    "https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/440px-Wikipedia-logo-v2.svg.png";
export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    let condensedSummary: string | undefined;
    try {
        const page = await wiki().page(ctx.opts.search);
        const summary = await page.summary();

        condensedSummary = summary.split("\n").shift();
    } catch (e) {
        throw new CommandError("Unable to find that page!");
    }

    if (!condensedSummary) throw new CommandError("Unable to get summary");

    const embed = new MessageEmbed()
        .setAuthor(F.titleCase(ctx.opts.search), wikipediaLogo)
        .setColor("#AAACAE")
        .setDescription(condensedSummary);

    await ctx.send({ embeds: [embed.toJSON()] });
};
