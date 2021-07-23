import { Poll, Vote } from "@prisma/client";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { EmbedField, Message, MessageActionRow, MessageEmbed, MessageSelectMenu } from "discord.js";
import EmojiReg from "emoji-regex";
import { ApplicationCommandOption, CommandOptionType, ComponentActionRow, PartialEmoji } from "slash-create";
import progressBar from "string-progressbar";
import { prisma } from "../../helpers/prisma-init";

const REQUIRED_OPTIONS = <const>[1, 2];
const OPTIONAL_OPTIONS = <const>[3, 4, 5, 6, 7, 8, 9, 10];

// [1, 2, 3,...] => { option1: string, option2: string, option3: string, ... }
type OPTIONS_OF<T extends Readonly<Array<number>>> = Record<`option${T[number]}`, string>;

type OptType = { title: string } & OPTIONS_OF<typeof REQUIRED_OPTIONS> & Partial<OPTIONS_OF<typeof OPTIONAL_OPTIONS>>;

const OPTIONS = [...REQUIRED_OPTIONS, ...OPTIONAL_OPTIONS];
export const Options: CommandOptions = {
    description: "Creates a message that users can react to to receive a role",
    options: [
        {
            name: "title",
            description: "The title for the poll",
            required: true,
            type: CommandOptionType.STRING
        },
        ...OPTIONS.map(
            (opt) =>
                <ApplicationCommandOption>{
                    name: `option${opt}`,
                    description: `Option #${opt}. If you want the button to have an emoji, set it as the first character in this option.`,
                    required: opt <= 2, // Need at least two options for a poll
                    type: CommandOptionType.STRING
                }
        )
    ]
};

const answerListener = new CommandComponentListener("pollresponse", <const>["pollID"]);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

type ParsedOption = { text: string; emoji?: string };
export const Executor: CommandRunner<OptType> = async (ctx) => {
    await ctx.defer();

    const { title, ...optDict } = ctx.opts;

    const options = <string[]>(
        OPTIONS.map((num) => optDict[`option${num}` as `option${typeof OPTIONS[number]}`]).filter(
            (opt) => opt !== undefined
        )
    );

    const discordEmojiRegex = /<a{0,1}:(?<name>.*?):(?<id>\d+)>/;

    const parsedOptions: ParsedOption[] = [];

    for (const option of options) {
        const discordMatch = option.match(discordEmojiRegex);

        // Has valid Discord emoji
        if (discordMatch?.index === 0) {
            const emoji = discordMatch[0];
            parsedOptions.push({ text: option.replace(emoji, "").trim(), emoji });
        }
        // Doesn't have a Discord emoji, might have a unicode emoji
        else {
            const emojiReg = EmojiReg();
            const possibleEmoji = option.split(" ")[0];
            const isEmoji = emojiReg.test(possibleEmoji);
            const text = isEmoji ? option.split(" ").slice(1).join(" ") : option;
            const emoji = isEmoji ? possibleEmoji : undefined;
            parsedOptions.push({ text, emoji });
        }
    }

    const poll = await ctx.prisma.poll.create({
        data: { userId: ctx.user.id, name: title, options: parsedOptions.map((p) => p.text) },
        include: { votes: true }
    });

    const embed = new MessageEmbed()
        .setTitle(title)
        .setAuthor(ctx.member.displayName, ctx.user.avatarURL)
        .setFooter(
            "Press one of the buttons below to vote. Your vote will be reflected in the message stats, and you can only vote once."
        );

    embed.fields = generateStatsDescription(poll, parsedOptions);

    const selectMenu = new MessageSelectMenu()
        .setCustomID(answerListener.generateCustomID({ pollID: poll.id.toString() }))
        .setPlaceholder("Select a poll choice");

    for (let i = 0; i < parsedOptions.length; i++) {
        const option = parsedOptions[i];
        const emoji = option.emoji;
        selectMenu.addOptions({ label: option.text, emoji, value: `${i}` });
    }

    const actionRow = new MessageActionRow().addComponents(selectMenu).toJSON();

    await ctx.send({ embeds: [embed.toJSON()], components: [actionRow as ComponentActionRow] });
};

type PollWithVotes = Poll & { votes: Vote[] };
function generateStatsDescription(poll: PollWithVotes, parsedOptions: ParsedOption[]): EmbedField[] {
    // Calculate votes for each option
    const votes = parsedOptions.map(() => 0);
    const totalVotes = poll.votes.length;

    for (const vote of poll.votes) {
        votes[vote.choice]++;
    }

    const tempEmbed = new MessageEmbed();

    parsedOptions.forEach((opt, idx) => {
        const [progress] = progressBar.filledBar(totalVotes === 0 ? 1 : totalVotes, votes[idx], 20);

        tempEmbed.addField(`${opt.emoji} ${opt.text}`.trim(), `${progress} [${votes[idx]}/${totalVotes}]`);
    });

    return tempEmbed.fields;
}

// Button handler
answerListener.handler = async (interaction, connection, args) => {
    if (!interaction.isSelectMenu()) return;
    const { pollID } = args;
    const index = interaction.values?.[0];
    const guild = interaction.guild;
    if (typeof index === "undefined" || !guild) return;

    const msg = interaction.message as Message;

    const poll = await prisma.poll.findUnique({ where: { id: +pollID }, include: { votes: true } });
    if (!poll) return;

    // Ensure user hasn't voted
    const previousVote = poll.votes.find((vote) => vote.userId === interaction.user.id);

    const castVote = await prisma.vote.upsert({
        where: { id: previousVote?.id || -1 },
        update: { choice: +index },
        create: { choice: +index, userId: interaction.user.id, pollId: poll.id }
    });

    // Update poll object
    if (previousVote) previousVote.choice = castVote.choice;
    else poll.votes.push(castVote);

    const parsedOptions: ParsedOption[] = [];
    for (const actionRow of msg.components) {
        const selectMenu = actionRow.components[0];
        if (selectMenu.type !== "SELECT_MENU") return;

        for (const option of selectMenu.options) {
            const emoji = option.emoji as PartialEmoji;
            const emojiString = emoji.id ? (await guild.emojis.fetch(emoji.id.toSnowflake())).toString() : emoji.name;
            parsedOptions.push({ text: option.label as string, emoji: emojiString });
        }
    }

    const embed = msg.embeds[0];

    embed.fields = generateStatsDescription(poll, parsedOptions);

    await msg.edit({ embeds: [embed] });
};
