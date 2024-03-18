import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, roleMention } from "discord.js";
import { emojiIDs } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { District, dailyDistrictOrder } from "./districts.consts";
import { format } from "date-fns";
import { CommandError } from "../../Configuration/definitions";
import { BishopType } from "@prisma/client";

const entrypoint = new ManualEntrypoint();

// const cron = Cron("0 17 * * *", { timezone: "Europe/Amsterdam" }, districtCron);

export async function concludePreviousBattle(): Promise<void> {
    // const latestBattle = await prisma.districtBattleGroup.findFirst({
    //     orderBy: { createdAt: "desc" }
    // });

    // TODO: Do something...
}

interface QtrAlloc {
    i: number;
    ii: number;
    iii: number;
    iv: number;
}

async function getQtrAlloc(battleId: number, defender: BishopType, isAttack: boolean): Promise<QtrAlloc> {
    const battle = await prisma.districtBattle.findFirst({
        where: {
            battleGroupId: battleId,
            defender
        }
    });

    if (!battle) return { i: 0, ii: 0, iii: 0, iv: 0 };

    const votes = await prisma.districtBattleGuess.findMany({
        where: { dailyDistrictBattleId: battle.id, isAttackVote: isAttack }
    });

    const qtrVotes = { i: 0, ii: 0, iii: 0, iv: 0 };
    for (const vote of votes) {
        const qtr = (<const>["i", "ii", "iii", "iv"])[vote.quarter];
        qtrVotes[qtr]++;
    }

    return qtrVotes;
}

function calculateAllocatedCurrency(votes: QtrAlloc, currencyAmount: number): QtrAlloc {
    const totalVotes = votes.i + votes.ii + votes.iii + votes.iv;

    if (totalVotes === 0) return { i: 0, ii: 0, iii: 0, iv: 0 };

    // Rough allocation
    const allocatedCurrency = {
        i: Math.floor((votes.i / totalVotes) * currencyAmount),
        ii: Math.floor((votes.ii / totalVotes) * currencyAmount),
        iii: Math.floor((votes.iii / totalVotes) * currencyAmount),
        iv: Math.floor((votes.iv / totalVotes) * currencyAmount)
    };

    // Distribute the remainder
    let remainder = currencyAmount - (allocatedCurrency.i + allocatedCurrency.ii + allocatedCurrency.iii + allocatedCurrency.iv);
    const sortedVotes = F.entries(allocatedCurrency).sort((a, b) => b[1] - a[1]);
    for (const vote of sortedVotes) {
        if (remainder === 0) break;

        allocatedCurrency[vote[0]]++;
        remainder--;
    }

    return allocatedCurrency;
}

async function buildDefendingEmbed(raider: District, currencyAmount: number, qtrVotes: QtrAlloc): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Being raided by ${raider.role.name.toUpperCase()}`, iconURL: raider.imageUrl })
        .setDescription(`Rumors have reached my ear that a raiding party from ${roleMention(raider.role.id)} intends to test our resolve and seize our riches from us today; ensure those credits are wisely hidden among the four quarters of our district.`);

    const allocatedCurrency = calculateAllocatedCurrency(qtrVotes, currencyAmount);

    for (const [qtr, votes] of F.entries(qtrVotes)) {
        embed.addFields({
            name: `${F.emoji(emojiIDs.quarters[qtr as keyof QtrAlloc])} Qtr. ${qtr.toUpperCase()}`,
            value: `${votes} vote${F.plural(votes)} ⇒ **ↁ${allocatedCurrency[qtr]}**`,
            inline: true
        });
    }

    return embed;
}

async function buildAttackEmbed(beingAttacked: District, qtrVotes: QtrAlloc): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Attacking ${beingAttacked.role.name.toUpperCase()}`, iconURL: beingAttacked.imageUrl })
        .setDescription(`In reciprocity, I have deemed that the wealth harbored within ${roleMention(beingAttacked.role.id)} would better serve the Sacred Municipality of Dema under my stewardship. Thus, we shall embark on a raid upon one of their quarters at nightfall.`);

    for (const [qtr, votes] of F.entries(qtrVotes)) {
        embed.addFields({
            name: `${F.emoji(emojiIDs.quarters[qtr as keyof QtrAlloc])} Qtr. ${qtr.toUpperCase()}`,
            value: `${votes} vote${F.plural(votes)}`,
            inline: true
        });
    }

    return embed;
}

export async function districtCron() {
    await concludePreviousBattle();

    const newBattleGroup = await prisma.districtBattleGroup.create({ data: {} });
    const districts = await dailyDistrictOrder(newBattleGroup.id);

    // This will probably be randomized per day
    const currencyAmount = 50;

    for (let i = 0; i < 1; i++) {
        const prevDistrict = districts.at(i - 1)!;
        const district = districts[i];
        const nextDistrict = districts[(i + 1) % districts.length];

        const battle = await prisma.districtBattle.create({
            data: {
                battleGroupId: newBattleGroup.id,
                attacker: prevDistrict.bishopType,
                defender: district.bishopType,
                credits: currencyAmount,
            }
        });

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Announcement from ${district.name.toUpperCase()}`, iconURL: district.imageUrl })
            .setTitle(format(new Date(), "YYY MM'MOON' dd"))
            .setColor(district.role.color)
            .setDescription(`Good morning, my faithful citizens. Today, I bestow upon you a blessing of **ↁ${currencyAmount}** in credits. (Results from yesterday)`)
            .setFooter({ text: "See the pinned message in #glorious-vista for how to play" });

        const defendingEmbed = await buildDefendingEmbed(district, currencyAmount, await getQtrAlloc(newBattleGroup.id, district.bishopType, false));
        const attackingEmbed = await buildAttackEmbed(prevDistrict, await getQtrAlloc(newBattleGroup.id, nextDistrict.bishopType, true));

        const defendingMenu = new StringSelectMenuBuilder()
            .setCustomId(genDefendId({ districtBattleId: battle.id }))
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`Vote for a QTR to hide credits from ${prevDistrict.role.name.toUpperCase()}`)
            .setOptions([
                { label: "Hide in QTR I", value: "0", emoji: { id: emojiIDs.quarters.i } },
                { label: "Hide in QTR II", value: "1", emoji: { id: emojiIDs.quarters.ii } },
                { label: "Hide in QTR III", value: "2", emoji: { id: emojiIDs.quarters.iii } },
                { label: "Hide in QTR IV", value: "3", emoji: { id: emojiIDs.quarters.iv } }
            ]);

        const attackingMenu = new StringSelectMenuBuilder()
            .setCustomId(genAttackId({ districtBattleId: battle.id }))
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`Vote for a QTR to search in ${nextDistrict.role.name.toUpperCase()}`)
            .setOptions([
                { label: "Attack QTR I", value: "0", emoji: { id: emojiIDs.quarters.i } },
                { label: "Attack QTR II", value: "1", emoji: { id: emojiIDs.quarters.ii } },
                { label: "Attack QTR III", value: "2", emoji: { id: emojiIDs.quarters.iii } },
                { label: "Attack QTR IV", value: "3", emoji: { id: emojiIDs.quarters.iv } }
            ]);

        const defendingActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(defendingMenu);
        const attackingActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(attackingMenu);

        await district.webhook.client.send({ embeds: [embed], allowedMentions: { parse: [] } });
        await district.webhook.client.send({ embeds: [defendingEmbed], components: [defendingActionRow], allowedMentions: { parse: [] } });
        await district.webhook.client.send({ embeds: [attackingEmbed], components: [attackingActionRow], allowedMentions: { parse: [] } });
    }
}

const genAttackId = entrypoint.addInteractionListener("districtAttackSel", ["districtBattleId"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu()) return;
    await ctx.deferUpdate();

    const qtrIndex = parseInt(ctx.values[0]);

    const result = await prisma.districtBattleGuess.upsert({
        where: {
            dailyDistrictBattleId_userId_isAttackVote: {
                dailyDistrictBattleId: args.districtBattleId,
                userId: ctx.user.id,
                isAttackVote: true
            }
        },
        update: {
            quarter: qtrIndex,
        },
        create: {
            dailyDistrictBattleId: args.districtBattleId,
            userId: ctx.user.id,
            quarter: qtrIndex,
            isAttackVote: true,
        },
        select: {
            dailyDistrictBattle: true
        }
    });

    // Get District being attacked
    const districts = await dailyDistrictOrder(result.dailyDistrictBattle.battleGroupId);
    const beingAttacked = districts.find(b => b.bishopType === result.dailyDistrictBattle.defender);
    const raider = districts.find(b => b.bishopType === result.dailyDistrictBattle.attacker);

    if (!beingAttacked || !raider) throw new CommandError("District not found");

    const newAttackEmbed = await buildAttackEmbed(raider, await getQtrAlloc(result.dailyDistrictBattle.battleGroupId, beingAttacked.bishopType, true));
    await ctx.editReply({
        embeds: [newAttackEmbed]
    })

    const emojiId = Object.values(emojiIDs.quarters)[qtrIndex];
    await ctx.followUp({
        content: `You selected ${F.emoji(emojiId)} QTR ${["I", "II", "III", "IV"][qtrIndex]}`,
        ephemeral: true
    });
});

const genDefendId = entrypoint.addInteractionListener("districtDefendSel", ["districtBattleId"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu()) return;
    await ctx.deferUpdate();

    const qtrIndex = parseInt(ctx.values[0]);

    const result = await prisma.districtBattleGuess.upsert({
        where: {
            dailyDistrictBattleId_userId_isAttackVote: {
                dailyDistrictBattleId: args.districtBattleId,
                userId: ctx.user.id,
                isAttackVote: false
            }
        },
        update: {
            quarter: qtrIndex,
        },
        create: {
            dailyDistrictBattleId: args.districtBattleId,
            userId: ctx.user.id,
            quarter: qtrIndex,
            isAttackVote: false
        },
        select: {
            dailyDistrictBattle: true
        }
    });

    // Get District being attacked
    const districts = await dailyDistrictOrder(result.dailyDistrictBattle.battleGroupId);
    const beingDefended = districts.find(b => b.bishopType === result.dailyDistrictBattle.defender);
    if (!beingDefended) throw new CommandError("District not found");

    const newDefendEmbed = await buildDefendingEmbed(beingDefended, result.dailyDistrictBattle.credits, await getQtrAlloc(result.dailyDistrictBattle.battleGroupId, beingDefended.bishopType, false));
    await ctx.editReply({
        embeds: [newDefendEmbed]
    })

    const emojiId = Object.values(emojiIDs.quarters)[qtrIndex];
    await ctx.followUp({
        content: `You selected ${F.emoji(emojiId)} QTR ${["I", "II", "III", "IV"][qtrIndex]}`,
        ephemeral: true
    });
});

export default entrypoint;
