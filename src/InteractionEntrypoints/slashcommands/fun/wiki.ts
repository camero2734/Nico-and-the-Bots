import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import WikiJS from "wikijs";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const wikipediaLogo =
	"https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/440px-Wikipedia-logo-v2.svg.png";

const wiki = WikiJS({
	headers: {
		"User-Agent":
			"Nico-Discord-Bot (https://github.com/camero2734/Nico-and-the-Bots; discordclique@gmail.com) wiki.js",
	},
});

const command = new SlashCommand({
	description: "Grabs the summary of something from Wikipedia",
	options: [
		{
			name: "search",
			description: "The term to search for",
			required: true,
			type: ApplicationCommandOptionType.String,
		},
		{
			name: "full",
			description: "Includes more information from the page",
			required: false,
			type: ApplicationCommandOptionType.Boolean,
		},
	],
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

	if (!condensedSummary || !url || !title)
		throw new CommandError("Unable to find page info");

	const embed = new EmbedBuilder()
		.setAuthor({ name: title, iconURL: wikipediaLogo, url: url })
		.setColor(0xaaacae)
		.setDescription(condensedSummary);

	if (ctx.opts.full) {
		for (const field of fields.slice(0, 10)) {
			const content = field.content || "*No content*";
			embed.addFields([{ name: field.title, value: F.truncate(content, 200) }]);
		}
	}

	await ctx.send({ embeds: [embed] });
});

export default command;
