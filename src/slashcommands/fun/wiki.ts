import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import WikiJS from "wikijs";
import { Tag } from "../../database/entities/Tag";
import F from "../../helpers/funcs";

export const Options = createOptions(<const>{
    description: "Grabs the summary of something from Wikipedia",
    options: [{ name: "search", description: "The term to search for", required: true, type: CommandOptionType.STRING }]
});

const wikipediaLogo =
    "https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/440px-Wikipedia-logo-v2.svg.png";

const wiki = WikiJS({
    headers: {
        "User-Agent":
            "Nico-Discord-Bot (https://github.com/camero2734/Nico-and-the-Bots; discordclique@gmail.com) wiki.js"
    }
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    let condensedSummary: string | undefined;
    const fields: { title: string; content: string }[] = [];
    let title: string | undefined;
    let url: string | undefined;
    try {
        const result = await wiki.search(ctx.opts.search, 5);
        const pageName = result.results[0];
        const page = await wiki.page(pageName);
        const summary = await page.summary();
        const content = (await page.content()) as unknown as typeof fields; // Library types it wrong :(

        condensedSummary = summary.split("\n").shift();
        fields.push(...content);
        title = F.titleCase(pageName);
        url = page.url();
    } catch (e) {
        throw new CommandError("Unable to find that page!");
    }

    if (!condensedSummary || !url || !title) throw new CommandError("Unable to find page info");

    const embed = new MessageEmbed()
        .setAuthor(title, wikipediaLogo, url)
        .setColor("#AAACAE")
        .setDescription(condensedSummary);

    for (const field of fields.slice(0, 10)) {
        const content = field.content || "*No content*";
        embed.addField(field.title, F.truncate(content, 200));
    }

    await ctx.send({ embeds: [embed.toJSON()] });
};
