import { Cron } from "croner";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageEditOptions, ThreadAutoArchiveDuration, italic, roleMention } from "discord.js";
import { nanoid } from "nanoid";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { Album, PREFIX, Result, SongContender, buttonColors, calculateHistory, determineNextMatchup, determineResult, embedFooter, fromSongId, toSongId } from "./songbattle.consts";

const entrypoint = new ManualEntrypoint();

export const cron = Cron("0 17 * * *", { timezone: "Europe/Amsterdam" }, songBattleCron);

const SLOWMODE_SECONDS = 30;

// Enable slowmode in the old thread after a while
Cron("30 17 * * *", { timezone: "Europe/Amsterdam" }, async () => {
    // Get song battle channel
    const channel = await guild.channels.fetch(channelIDs.songbattles);
    if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

    // Get the latest poll
    const poll = await prisma.poll.findMany({
        where: {
            name: { startsWith: PREFIX },
        },
        orderBy: { id: "desc" },
        take: 2,
    });

    if (!poll) return;

    const [_, previousPoll] = poll;

    const message = await channel.messages.fetch(previousPoll.options[2]);

    if (message) {
        const thread = message.thread;
        if (thread) await thread.setRateLimitPerUser(SLOWMODE_SECONDS);
    }
});

export async function songBattleCron() {
    // Get song battle channel
    const channel = await guild.channels.fetch(channelIDs.songbattles);
    if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

    // Determine the next matchup
    const { song1, song2, song1Wins, song2Wins, album1, album2, nextBattleNumber, totalMatches } = await determineNextMatchup();

    // Update the previous battle's message
    await updatePreviousSongBattleMessage();

    // Pick two random button colors
    const [button1, button2] = [
        [ButtonStyle.Secondary, "#4F545C"],
        [ButtonStyle.Secondary, "#4F545C"]
    ] as const;

    // const buffer = await generateSongImages(album1, album2, song1, song2, button1[1] || "#000", button2[1] || "#000");

    const startsAt = new Date();
    const endsAt = cron.nextRun()!;

    // Ping message
    await channel.send({ content: roleMention(roles.songBattles), allowedMentions: { roles: [roles.songBattles] } });

    // Placeholder message
    const startEmbed = new EmbedBuilder().setDescription("Receiving new song battle...");
    const m = await channel.send({ embeds: [startEmbed] });

    // Create database poll
    const pollName = `${PREFIX}${nextBattleNumber}-${nanoid(10)}`;
    const poll = await prisma.poll.create({
        data: {
            name: pollName,
            options: [toSongId(song1, album1), toSongId(song2, album2), m.id],
        }
    });

    const msgOptions = await createMessageComponents({
        pollId: poll.id,
        nextBattleNumber,
        totalMatches,
        startsAt,
        song1: {
            song: song1,
            album: album1,
            buttonStyle: button1[0],
            nextBattleNumber,
            wins: song1Wins
        },
        song2: {
            song: song2,
            album: album2,
            buttonStyle: button2[0],
            nextBattleNumber,
            wins: song2Wins
        }
    });

    // Send the main message
    await m.edit(msgOptions);

    // Create a discussion thread
    const thread = await m.startThread({
        name: `Clancy Song Battle #${nextBattleNumber}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay
    });

    await thread.send(`**Welcome to the song battle!** Discuss the two songs here. The winner will be revealed ${F.discordTimestamp(endsAt, "relative")}`);
}

export async function updatePreviousSongBattleMessage(skip = 0) {
    const channel = await guild.channels.fetch(channelIDs.songbattles);
    if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

    // Update the previous battle's message
    const previousPoll = await prisma.poll.findFirst({
        where: {
            name: { startsWith: PREFIX },
        },
        orderBy: { id: "desc" },
        include: { votes: true },
        skip: skip
    });
    const previousMessageId = previousPoll?.options[2];


    if (previousMessageId) {
        const previousMessage = await channel.messages?.fetch(previousMessageId);
        const result = determineResult(previousPoll);

        if (previousMessage) {
            const embed = new EmbedBuilder(previousMessage.embeds[0].data);

            let winnerIdx = result !== Result.Tie && (result === Result.Song1 ? 0 : 1);

            for (let i = 0; i < (embed.data.fields?.length || 0); i++) {
                const field = embed.data.fields?.[i];
                if (!field) continue;

                const voteCount = previousPoll.votes.filter(v => v.choices[0] === i).length;
                field.name = i === winnerIdx ? `🏆 ${field.name}` : field.name;
                field.value = `${field.value} (${voteCount} vote${F.plural(voteCount)})`;
            }

            if (winnerIdx === false) {
                embed.addFields({
                    name: "🙁 Tie",
                    value: "No winner was determined. These songs will be put back into the pool.",
                });
            }

            // Disable the buttons
            const actionRow = previousMessage.components[0].toJSON();
            actionRow.components.forEach(c => c.disabled = true);

            await previousMessage.edit({ embeds: [embed], components: [actionRow], files: [...previousMessage.attachments.values()] });
        }
    }
}

export async function updateCurrentSongBattleMessage() {
    // Get the latest poll
    const poll = await prisma.poll.findFirst({
        where: {
            name: { startsWith: PREFIX },
        },
        orderBy: { id: "desc" },
    });

    if (!poll) return false;

    const channel = await guild.channels.fetch(channelIDs.songbattles);
    if (!channel?.isTextBased()) throw new CommandError("Invalid channel");

    const msg = await channel.messages.fetch(poll.options[2]);
    if (!msg) return false;

    const { totalMatches } = await determineNextMatchup();

    const song1 = fromSongId(poll.options[0]);
    const song2 = fromSongId(poll.options[1]);

    // Pick two random button colors
    const [button1, button2] = F.shuffle(F.entries(buttonColors)).slice(0, 2);

    const { histories, previousBattlesRaw } = await calculateHistory();

    const song1Wins = histories.get(poll.options[0])?.rounds || 1;
    const song2Wins = histories.get(poll.options[1])?.rounds || 1;
    const nextBattleNumber = previousBattlesRaw.length;

    const msgOptions = await createMessageComponents({
        pollId: poll.id,
        nextBattleNumber,
        totalMatches,
        startsAt: new Date(),
        song1: {
            song: song1.song,
            album: song1.album,
            buttonStyle: button1[0],
            nextBattleNumber,
            // Need to subtract 1 because the battle hasn't ended yet
            wins: song1Wins - 1
        },
        song2: {
            song: song2.song,
            album: song2.album,
            buttonStyle: button2[0],
            nextBattleNumber,
            wins: song2Wins - 1
        }
    });

    await msg.edit(msgOptions);
}

interface SongBattleDetails {
    pollId: number;
    nextBattleNumber: number;
    totalMatches: number;
    startsAt: Date;
    song1: SongBattleContender;
    song2: SongBattleContender;
}

interface SongBattleContender {
    song: SongContender;
    album: Album;
    buttonStyle: ButtonStyle;
    nextBattleNumber: number;
    wins: number;
}

async function createMessageComponents(details: SongBattleDetails): Promise<MessageEditOptions> {
    const { pollId, nextBattleNumber, totalMatches, song1, song2, startsAt } = details;

    const wins1 = song1.wins > 0 ? ` 🏅x${song1.wins}` : "";
    const wins2 = song2.wins > 0 ? ` 🏅x${song2.wins}` : "";

    const emoji1 = `<:emoji:${song1.album.emoji}>`;
    const emoji2 = `<:emoji:${song2.album.emoji}>`;

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(`Battle #${nextBattleNumber} / ${totalMatches}`)
        .setThumbnail("attachment://battle.png")
        .addFields([
            { name: `${song1.song.name}${wins1}`, value: `${emoji1} ${italic(song1.album.name)} | [YT](${song1.song.yt})`, inline: true },
            { name: `${song2.song.name}${wins2}`, value: `${emoji2} ${italic(song2.album.name)} | [YT](${song2.song.yt})`, inline: true },
        ])
        .setColor(song1.album.color)
        .setFooter({ text: embedFooter(0) })
        .setTimestamp(startsAt);

    // Create message components
    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder()
            .setCustomId(genButtonId({ songId: toSongId(song1.song, song1.album), pollId: pollId.toString() }))
            .setStyle(song1.buttonStyle)
            .setLabel(song1.song.name)
            .setEmoji(song1.album.emoji),
        new ButtonBuilder()
            .setCustomId(genButtonId({ songId: toSongId(song2.song, song2.album), pollId: pollId.toString() }))
            .setStyle(song2.buttonStyle)
            .setLabel(song2.song.name)
            .setEmoji(song2.album.emoji)
    ]);

    return { embeds: [embed], components: [actionRow] };
}

const genButtonId = entrypoint.addInteractionListener("songBattleButton", ["pollId", "songId"], async (ctx, args) => {
    await ctx.deferReply({ ephemeral: true });
    if (!ctx.isButton()) return;

    // Find associated poll
    const pollId = parseInt(args.pollId);
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) throw new CommandError("Poll not found");

    const choiceId = poll.options.findIndex(o => o === args.songId);

    // Check if the user has already voted
    const existingVote = await prisma.vote.findFirst({
        select: { id: true, choices: true },
        where: { pollId, userId: ctx.user.id }
    });

    // Create or update the vote
    await prisma.vote.upsert({
        where: { pollId_userId: { pollId, userId: ctx.user.id } },
        create: {
            pollId,
            userId: ctx.user.id,
            choices: [choiceId]
        },
        update: {
            choices: [choiceId]
        }
    });

    const totalVotes = await prisma.vote.count({ where: { pollId } });

    const { song, album } = fromSongId(args.songId);

    const embed = new EmbedBuilder(ctx.message.embeds[0].data);
    embed.setFooter({ text: embedFooter(totalVotes) });

    await ctx.message.edit({ embeds: [embed], files: [...ctx.message.attachments.values()] });

    if (existingVote) {
        if (existingVote.choices[0] === choiceId) await ctx.editReply({ content: `You already voted for ${song.name} on the album ${album.name}. But thanks for confirming.` });
        else await ctx.editReply({ content: `You changed your vote to ${song.name} on the album ${album.name}` });
    } else {
        await ctx.editReply({ content: `You voted for ${song.name} on the album ${album.name}` });
    }
});

export default entrypoint;
