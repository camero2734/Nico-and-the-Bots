import { MessageEmbed } from "discord.js";
import WikiJS from "wikijs";
import { CommandError } from "../../configuration/definitions";
import F from "../../helpers/funcs";
import { SlashCommand } from "../../structures/EntrypointSlashCommand";

const wikipediaLogo =
    "https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/440px-Wikipedia-logo-v2.svg.png";

const wiki = WikiJS({
    headers: {
        "User-Agent":
            "Nico-Discord-Bot (https://github.com/camero2734/Nico-and-the-Bots; discordclique@gmail.com) wiki.js"
    }
});

const command = new SlashCommand(<const>{
    description: "Grabs the summary of something from Wikipedia",
    options: [
        { name: "search", description: "The term to search for", required: true, type: "STRING" },
        { name: "full", description: "Includes more information from the page", required: false, type: "BOOLEAN" }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

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

    if (ctx.opts.full) {
        for (const field of fields.slice(0, 10)) {
            const content = field.content || "*No content*";
            embed.addField(field.title, F.truncate(content, 200));
        }
    }

    await ctx.send({ embeds: [embed] });
});

export default command;
