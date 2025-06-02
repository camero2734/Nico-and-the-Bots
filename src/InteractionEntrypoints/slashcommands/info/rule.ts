import { CommandError } from "../../../Configuration/definitions";
import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import Fuse from "fuse.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

class Rule {
	static ruleNum = 0;
	text: string;
	num: number;
	constructor(
		public rule: string,
		public description: string,
		public category: string,
	) {
		this.text = `**${rule}**\n${description}`;
		this.num = ++Rule.ruleNum;
	}
	send(ctx: typeof command.ContextType) {
		const embed = new EmbedBuilder()
			.setColor(0xe6fafc)
			.setTitle(`Rule ${this.num}`)
			.setDescription(this.text)
			.setFooter({ text: this.category });
		return ctx.send({ embeds: [embed.toJSON()] });
	}
}
const rules = [
	new Rule(
		"Per Discord terms, you must be 13 or older to be in this server.",
		"Any user found to be below the age of 13 will be banned and may rejoin once they turn 13.",
		"General",
	),
	new Rule(
		"You may not use an alt/secondary account of any kind, especially for evasion of punishments, unless permitted by staff.",
		"You may only have one account on the server at a time. You may not *under any circumstances* join on another account if you are muted, warned, or have any other actions taken against you. This will result in a permanent ban against you.",
		"General",
	),
	new Rule(
		"Listen to the staff; DM an admin if there is a major problem related to staff issues.",
		"You may contact the staff by DM'ing them, using the /submit suggestion command (when relevant), or by sending Sacarver (the bot) a DM.",
		"General",
	),
	new Rule(
		"Try not to find loopholes to justify bad behavior (Use common sense)",
		"We base rule breaks on our own judgement. While we are open to discuss rule breaks and punishments, trying to justify poor behavior based on your judgement wont get you anywhere.",
		"General",
	),
	new Rule(
		"If you seem like a troll, you will get banned.",
		"We have little patience for users who join to purposefully make users uncomfortable and break rules.",
		"General",
	),
	new Rule(
		"Spamming messages or images is not allowed",
		"This includes sending the same content repeatedly, or just sending many messages in a short time period.",
		"Messaging",
	),
	new Rule(
		"No NSFW or use of slurs, regardless of context",
		"This will almost always result in a ban.",
		"Messaging",
	),
	new Rule(
		"Make sure to direct content to their appropriate channels (i.e. bot use in #commands)",
		"If you send messages that don't belong in a channel, you will simply be asked to move to the appropriate channel. Most channels are named in a way that you can easily identify their purpose!",
		"Messaging",
	),
	new Rule(
		"No advertising other Discord servers",
		"This especially applies to large servers, but also even to small, personal ones. (If you find friends on the server and want to invite them to a friend group, just DM them!)",
		"Messaging",
	),
	new Rule(
		"Civil discussions/disagreements are always welcome.",
		"Only contact a moderator once things become hostile.",
		"Messaging",
	),
	new Rule(
		"If at any time you need a moderator's assistance, either ping the <@&330877657132564480> role or ping/DM any online moderator/admin.",
		"You may also DM Sacarver to contact staff.",
		"Messaging",
	),
	new Rule(
		"Respect everyone",
		"This applies even if you don't like someone; this is not the place for expressing that.",
		"Interpersonal Conduct",
	),
	new Rule(
		"Always report any predatory behavior. Users who make this server an unsafe environment will be banned.",
		"If you see someone acting predatory, contact a Staff member.",
		"Interpersonal Conduct",
	),
	new Rule(
		"Do not cause public drama",
		"Whether it is drama from other servers or from this one, this is not the place to discuss it.",
		"Interpersonal Conduct",
	),
	new Rule(
		"Publicly posting negative statements about other members on social media or other servers is strictly prohibited.",
		"This mainly applies to social media sites (Twitter, Instagram, etc.) or other Discord servers. If you see this type of targeted harassment happen, please report it to a staff member.",
		"Interpersonal Conduct",
	),
	new Rule(
		"Racism, sexism, transphobia, homophobia, fascism, or any other prejudice behavior is taken very seriously on this server.",
		"Respect for other people has nothing to do with politics or opinion, and those who break this rule will be banned.",
		"Interpersonal Conduct",
	),
	new Rule(
		"While you should always report direct harassment and threatening behavior, the staff is not gonna step in to manage interpersonal drama that does not break server rules or Discord TOS.",
		"You should be able to handle the situation yourselves without bringing it into the server.",
		"Interpersonal Conduct",
	),
];

const options = {
	shouldSort: true,
	includeScore: true,
	threshold: 0.6,
	location: 0,
	distance: 100,
	minMatchCharLength: 1,
	keys: ["rule"],
};
const fuse = new Fuse(rules, options);

const command = new SlashCommand({
	description: "Displays a server rule",
	options: [
		{
			name: "rule",
			description: "A rule to search for, or a rule number",
			required: true,
			type: ApplicationCommandOptionType.String,
		},
	],
});

command.setHandler(async (ctx) => {
	const { rule } = ctx.opts;

	const ruleNum = Number(rule);
	if (isNaN(ruleNum)) {
		const results = fuse.search(rule);
		if (results.length === 0) throw new CommandError("Rule not found");
		results[0].item.send(ctx);
	} else {
		const rule = rules[ruleNum - 1];
		if (!rule) throw new CommandError("Rule not found");
		rule.send(ctx);
	}
});

export default command;
