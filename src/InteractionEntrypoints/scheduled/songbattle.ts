import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Cron } from "croner";
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder, ThreadAutoArchiveDuration, italic, roleMention } from "discord.js";
import { nanoid } from "nanoid";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { IMAGE_SIZE, PREFIX, Result, buttonColors, determineNextMatchup, embedFooter, fromSongId, toSongId } from "./songbattle.consts";

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
    const { song1, song2, song1Wins, song2Wins, album1, album2, nextBattleNumber, result, totalMatches } = await determineNextMatchup();

    // Update the previous battle's message
    const previousPoll = await prisma.poll.findFirst({
        where: {
            name: { startsWith: PREFIX },
        },
        orderBy: { id: "desc" },
        include: { votes: true }
    });
    const previousMessageId = previousPoll?.options[2];

    if (previousMessageId) {
        const previousMessage = await channel.messages?.fetch(previousMessageId);

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

    // Pick two random button colors
    const [button1, button2] = F.shuffle(F.entries(buttonColors)).slice(0, 2);

    // Create the image
    const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const cctx = canvas.getContext("2d");

    const leftImageUrl = album1.image || song1.image;
    const rightImageUrl = album2.image || song2.image;
    if (!leftImageUrl || !rightImageUrl) throw new CommandError("Missing image(s)");

    const leftImage = await loadImage(leftImageUrl);
    const rightImage = await loadImage(rightImageUrl);

    cctx.drawImage(leftImage, 0, 0, leftImage.width / 2, leftImage.height, 0, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    // Add a tint to the left iamge
    cctx.fillStyle = button1[1]!;
    cctx.globalAlpha = 0.4;
    cctx.fillRect(0, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    cctx.globalAlpha = 1;

    cctx.drawImage(rightImage, rightImage.width / 2, 0, rightImage.width / 2, rightImage.height, IMAGE_SIZE / 2, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    // Add a tint to the right image
    cctx.fillStyle = button2[1]!;
    cctx.globalAlpha = 0.4;
    cctx.fillRect(IMAGE_SIZE / 2, 0, IMAGE_SIZE / 2, IMAGE_SIZE);
    cctx.globalAlpha = 1;

    // Draw a divider
    const DIVIDER_WIDTH = 10;
    cctx.fillStyle = "white";
    cctx.fillRect(IMAGE_SIZE / 2 - DIVIDER_WIDTH / 2, 0, DIVIDER_WIDTH, IMAGE_SIZE);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "battle.png" });

    const startsAt = new Date();
    const endsAt = cron.nextRun()!;

    // Ping message
    await channel.send({ content: roleMention(roles.songBattles) });

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

    const wins1 = song1Wins > 0 ? ` (🏅x${song1Wins})` : "";
    const wins2 = song2Wins > 0 ? ` (🏅x${song2Wins})` : "";

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(`Battle #${nextBattleNumber} / ${totalMatches}`)
        .setThumbnail("attachment://battle.png")
        .addFields([
            { name: `${song1.name}${wins1}`, value: italic(album1.name), inline: true },
            { name: `${song2.name}${wins2}`, value: italic(album2.name), inline: true },
        ])
        .setColor(album1.color)
        .setFooter({ text: embedFooter(0) })
        .setTimestamp(startsAt);

    // Create message components
    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder()
            .setCustomId(genButtonId({ songId: toSongId(song1, album1), pollId: poll.id.toString() }))
            .setStyle(button1[0])
            .setLabel(song1.name)
            .setEmoji(album1.emoji),
        new ButtonBuilder()
            .setCustomId(genButtonId({ songId: toSongId(song2, album2), pollId: poll.id.toString() }))
            .setStyle(button2[0])
            .setLabel(song2.name)
            .setEmoji(album2.emoji)
    ]);

    // Send the main message
    await m.edit({ embeds: [embed], files: [attachment], components: [actionRow] });

    // Create a discussion thread
    const thread = await m.startThread({
        name: `Song Battle #${nextBattleNumber}`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay
    });

    await thread.send(`**Welcome to the song battle!** Discuss the two songs here. The winner will be revealed ${F.discordTimestamp(endsAt, "relative")}`);
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
        select: { id: true },
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
        await ctx.editReply({ content: `You changed your vote to ${song.name} on the album ${album.name}` });
    } else {
        await ctx.editReply({ content: `You voted for ${song.name} on the album ${album.name}` });
    }
});

export default entrypoint;
