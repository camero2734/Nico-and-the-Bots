import { ApplicationCommandOptionType, ChannelType, GuildMember, roleMention, userMention } from "discord.js";
import { channelIDs, userIDs, roles as roleIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";
import { districtCron } from "../../scheduled/districts";
import { updateCurrentSongBattleMessage, updatePreviousSongBattleMessage } from "../../scheduled/songbattle";
import { prisma } from "../../../Helpers/prisma-init";
import F from "../../../Helpers/funcs";

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
        await updatePreviousSongBattleMessage(1);
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
    } else if (ctx.opts.num === 74) {
        await districtCron();
        await ctx.editReply("Done with districtCron");
    } else if (ctx.opts.num === 89) {
        const results = {
            sacarver: 2_487,
            keons: 2_436,
            lisden: 2_417,
            reisdro: 2_314,
            vetomo: 2_310,
            nico: 2_297,
            nills: 2_290,
            andre: 2_270,
            listo: 2_210
        };

        const chan = await ctx.guild.channels.fetch(channelIDs.gloriousVista);
        if (chan?.type !== ChannelType.GuildText) return;

        const thread = await chan.threads.create({
            name: "District Battle Results",
            autoArchiveDuration: 60
        });

        const votingRounds = await prisma.districtBattleGroup.count();

        const allVotes = await prisma.districtBattleGuess.findMany({ select: { userId: true } });
        const userVotes = new Map<string, number>();

        for (const vote of allVotes) {
            const current = userVotes.get(vote.userId) ?? 0;
            userVotes.set(vote.userId, current + 1);
        }

        for (const [userId, votes] of userVotes) {
            if (votes > 1) {
                let member: GuildMember;
                try {
                    member = await ctx.guild.members.fetch(userId);
                } catch (e) {
                    continue;
                }
                if (!member) continue;
                const district = F.userBishop(member)?.name;
                if (!district) continue;

                const inWinningDistrict = district === "sacarver";

                const percentVoted = Math.min(1, votes / votingRounds);
                let amountEarned = Math.floor(results[district] * percentVoted);
                if (inWinningDistrict) amountEarned *= 2;

                let message = `${userMention(member.displayName)} voted ${votes} times in dst. ${district} and earned ${amountEarned} credits.`;
                if (inWinningDistrict) message += ` They were in the winning district, so their earnings were doubled and they won the ${roleMention(roleIDs.dema)} role.`;

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        credits: { increment: amountEarned },
                    }
                });

                if (inWinningDistrict) {
                    await member.roles.add(roleIDs.dema);
                }

                await thread.send({ content: message });
            }
        }

        await ctx.editReply("Done with districtBattle rewards");
    } else {
        const msg = withColor.map(x => roleMention(x.id)).join("\n");

        await ctx.editReply(msg);
    }
});

export default command;
