import { Poll, Vote } from "@prisma/client";
import { EmbedField, Message, MessageActionRow, MessageEmbed, MessageSelectMenu } from "discord.js";
import EmojiReg from "emoji-regex";
import { PartialEmoji } from "slash-create";
import progressBar from "string-progressbar";
import { channelIDs } from "../../configuration/config";
import { prisma } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";

const options = <const>[1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const command = new SlashCommand(<const>{
    description: "Creates a message that users can react to to receive a role",
    options: [
        {
            name: "title",
            description: "The title for the poll",
            required: true,
            type: "STRING"
        },
        ...options.map(
            (num) =>
                <const>{
                    name: `option${num}`,
                    description: `Option #${num}`,
                    required: num <= 2,
                    type: "STRING"
                }
        )
    ]
});

type ParsedOption = { text: string; emoji?: string };
command.setHandler(async (ctx) => {
    await ctx.defer();

    const shouldCreateThread = ctx.channel.id === channelIDs.polls;

    const { title, option1, option2, ...optDict } = ctx.opts;

    if (!option1 || !option2) throw new Error("First two options should be required");

    const options = [option1, option2, ...Object.values(optDict).filter((a): a is string => a)];

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

    const poll = await prisma.poll.create({
        data: { userId: ctx.user.id, name: title, options: parsedOptions.map((p) => p.text) },
        include: { votes: true }
    });

    const embed = new MessageEmbed()
        .setTitle(title) //
        .setAuthor(ctx.member.displayName, ctx.user.displayAvatarURL());

    embed.fields = generateStatsDescription(poll, parsedOptions);

    const selectMenu = new MessageSelectMenu()
        .setCustomId(genPollResId({ pollId: poll.id.toString() }))
        .setPlaceholder("Select a poll choice");

    for (let i = 0; i < parsedOptions.length; i++) {
        const option = parsedOptions[i];
        const emoji = option.emoji;
        selectMenu.addOptions({ label: option.text, emoji, value: `${i}` });
    }

    const actionRow = new MessageActionRow().addComponents(selectMenu);

    await ctx.send({ embeds: [embed], components: [actionRow] });
    if (shouldCreateThread) {
        const m = (await ctx.fetchReply()) as Message;
        await ctx.channel.threads.create({
            name: title,
            autoArchiveDuration: 4320,
            reason: "Auto poll thread",
            startMessage: m
        });
    }
});

const genPollResId = command.addInteractionListener("pollresponse", <const>["pollId"], async (ctx, args) => {
    if (!ctx.isSelectMenu()) return;
    const { pollId } = args;
    const index = ctx.values?.[0];
    const guild = ctx.guild;
    if (typeof index === "undefined" || !guild) return;

    const msg = ctx.message as Message;

    const poll = await prisma.poll.findUnique({ where: { id: +pollId }, include: { votes: true } });
    if (!poll) return;

    // Ensure user hasn't voted
    const previousVote = poll.votes.find((vote) => vote.userId === ctx.user.id);

    const castVote = await prisma.vote.upsert({
        where: { id: previousVote?.id || -1 },
        update: { choice: +index },
        create: { choice: +index, userId: ctx.user.id, pollId: poll.id }
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
            const emojiString = emoji?.id ? (await guild.emojis.fetch(emoji.id.toSnowflake())).toString() : emoji?.name;
            parsedOptions.push({ text: option.label as string, emoji: emojiString });
        }
    }

    const embed = msg.embeds[0];

    embed.fields = generateStatsDescription(poll, parsedOptions);

    await msg.edit({ embeds: [embed] });
});

type PollWithVotes = Poll & { votes: Vote[] };
function generateStatsDescription(poll: PollWithVotes, parsedOptions: ParsedOption[]): EmbedField[] {
    // Calculate votes for each option
    const votes = parsedOptions.map(() => 0);
    const totalVotes = poll.votes.length;

    for (const vote of poll.votes) {
        votes[vote.choice]++;
    }

    const optionsWithVotes = parsedOptions
        .map((opt, idx) => ({ opt, count: votes[idx] }))
        .sort((opt1, opt2) => opt2.count - opt1.count);

    const tempEmbed = new MessageEmbed();

    optionsWithVotes.forEach(({ opt, count }) => {
        const [progress] = progressBar.filledBar(totalVotes === 0 ? 1 : totalVotes, count, 20);
        const emoji = opt.emoji ? `${opt.emoji} ` : "";
        const basePercent = (100 * count) / totalVotes;
        const percent = (isFinite(basePercent) ? basePercent : 0).toPrecision(3);
        tempEmbed.addField(`${emoji}${opt.text}`.trim(), `${progress}  👥 ${count} (${percent}%)`);
    });

    return tempEmbed.fields;
}

export default command;
