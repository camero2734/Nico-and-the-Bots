import { ApplicationCommandOptionType, EmbedBuilder, roleMention, userMention } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";
import { updateCurrentSongBattleMessage, updatePreviousSongBattleMessage } from "../../scheduled/songbattle";
import { Result, calculateHistory, determineResult } from "../../scheduled/songbattle.consts";

const command = new SlashCommand({
    description: "Test command",
    options: [{
        name: "num",
        description: "Number of times to test",
        required: true,
        type: ApplicationCommandOptionType.Integer
    }]
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    await ctx.deferReply({ ephemeral: true });

    const roles = await ctx.guild.roles.fetch();
    const withColor = roles.filter(r => r.hexColor.toLowerCase() === "#ffc6d5");
    if (ctx.opts.num === 1) {
        await ctx.editReply("1");
    } else if (ctx.opts.num === 2) {
        await updateCurrentSongBattleMessage();
    } else if (ctx.opts.num === 3) {
        await updatePreviousSongBattleMessage(0);
    } else if (ctx.opts.num === 42) {
        for (const role of withColor.values()) {
            await role.delete();
        }

        await ctx.editReply("Done");
    } else if (ctx.opts.num === 69) {
        const concertChannelManager = getConcertChannelManager(ctx.guild);
        await concertChannelManager.initialize();
        await concertChannelManager.checkChannels();
        await ctx.editReply("Done checking concert channels");
    } else if (ctx.opts.num === 70) {
        const songBattleResults = await calculateHistory();
        const numberOfCorrectVotes = new Map<string, number>();
        const numberOfVotes = new Map<string, number>();

        for (const poll of songBattleResults.previousBattlesRaw) {
            const result = determineResult(poll);

            for (const vote of poll.votes) {
                const votedFor = vote.choices[0];
                const isCorrect = votedFor === 0 && result === Result.Song1 || votedFor === 1 && result === Result.Song2;

                numberOfVotes.set(vote.userId, (numberOfVotes.get(vote.userId) ?? 0) + 1);
                if (isCorrect) {
                    numberOfCorrectVotes.set(vote.userId, (numberOfCorrectVotes.get(vote.userId) ?? 0) + 1);
                }
            }
        }

        const sorted = [...numberOfCorrectVotes.entries()]
            .filter(([userId]) => numberOfVotes.get(userId)! >= 75)
            .sort((a, b) => b[1] - a[1]);
        const mostCorrect = sorted.slice(0, 20);
        const leastCorrect = sorted.slice(-20);
        const embed = new EmbedBuilder()
            .setFooter({ text: `Only users with 75 or more votes are shown, ${sorted.length} users in total` })
            .addFields({ name: "Most correct", value: mostCorrect.map(([userId, count]) => `${userMention(userId)}: ${count} / ${numberOfVotes.get(userId)}`).join("\n") })
            .addFields({ name: "Least correct", value: leastCorrect.map(([userId, count]) => `${userMention(userId)}: ${count} / ${numberOfVotes.get(userId)}`).join("\n") });

        await ctx.editReply({ embeds: [embed] });
    } else {
        const msg = withColor.map(x => roleMention(x.id)).join("\n");

        await ctx.editReply(msg);
    }
});

export default command;
