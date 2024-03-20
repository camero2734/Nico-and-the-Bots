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

interface BattleResult {
    attackedQtr: number;
    defenseQtrs: number[]; // Ties are possible and count in favor of the attacker
    credits: number;
    attacker: BishopType;
    defender: BishopType;
}

type DistrictResults = Partial<Record<BishopType, {
    offense: BattleResult;
    defense: BattleResult;
}>>;

export async function concludePreviousBattle(): Promise<DistrictResults> {
    const latestBattle = await prisma.districtBattleGroup.findFirst({
        orderBy: { createdAt: "desc" },
        include: { battles: { include: { guesses: true } } },
    });

    if (!latestBattle) return {};

    const results: DistrictResults = {};

    for (const battle of latestBattle.battles) {
        const faker = F.isolatedFaker(`battle:${battle.id}`);

        // Tally the votes for the attacker
        const { attacker, defender } = battle;
        const attackVotes = battle.guesses.filter(g => g.isAttackVote);

        const attackTally = [0, 0, 0, 0];
        for (const vote of attackVotes) {
            const qtr = vote.quarter;
            attackTally[qtr]++;
        }

        const maxAttackVotes = Math.max(...attackTally);
        // There can be multiple, but only one will be chosen
        const maxAttackQtrs = Object.keys(attackTally).filter(qtr => attackTally[+qtr] === maxAttackVotes).map(parseInt);

        // Choose a random quarter if there are multiple
        // If no votes were cast, no attack is made.
        const attackedQtr = maxAttackVotes <= 0 ? -1 : faker.helpers.arrayElement(maxAttackQtrs);

        // Tally the votes for the defender
        const defenseVotes = battle.guesses.filter(g => !g.isAttackVote);

        const defenseTally = [0, 0, 0, 0];
        for (const vote of defenseVotes) {
            const qtr = vote.quarter;
            defenseTally[qtr]++;
        }

        const maxDefenseVotes = Math.max(...defenseTally);
        // Ties are bad for the defender; any of the tied quarters will be considered a win for the attacker
        const defenseQtrs = Object.keys(defenseTally).filter(qtr => defenseTally[+qtr] === maxDefenseVotes).map(parseInt);

        const attackSuccess = defenseQtrs.includes(attackedQtr);
        const creditAlloc = calculateAllocatedCurrency({ i: defenseTally[0], ii: defenseTally[1], iii: defenseTally[2], iv: defenseTally[3] }, battle.credits);
        // If defender cast no votes, they lose all credits to the attacker
        let creditsWon = maxDefenseVotes <= 0 ? battle.credits : Math.max(...Object.values(creditAlloc));

        // If neither side cast votes, no one wins anything.
        if (maxAttackVotes <= 0 && maxDefenseVotes <= 0) creditsWon = 0;

        if (!results[attacker]) results[attacker] = {} as any;
        if (!results[defender]) results[defender] = {} as any;

        results[attacker]!.offense = {
            attackedQtr,
            defenseQtrs,
            credits: attackSuccess ? creditsWon : -creditsWon,
            attacker: attacker,
            defender
        };

        results[defender]!.defense = {
            attackedQtr,
            defenseQtrs,
            credits: attackSuccess ? -creditsWon : creditsWon,
            attacker: attacker,
            defender
        };
    }

    return results;
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
        .setAuthor({ name: `Being raided by ${raider.role.name}`, iconURL: raider.imageUrl })
        .setColor(raider.role.color)
        .setDescription(`Rumors have reached my ear that a raiding party from ${roleMention(raider.role.id)} intends to test our resolve and seize our riches from us today; ensure those credits are wisely hidden among the four quarters of our district.`);

    const allocatedCurrency = calculateAllocatedCurrency(qtrVotes, currencyAmount);
    const maxAlloc = Math.max(...Object.values(allocatedCurrency));
    const maxQtrs = [];

    for (const [qtr, votes] of F.entries(qtrVotes)) {
        const isMax = allocatedCurrency[qtr] === maxAlloc;
        if (isMax) maxQtrs.push(qtr);
        embed.addFields({
            name: `${F.emoji(emojiIDs.quarters[qtr as keyof QtrAlloc])} Qtr. ${qtr.toUpperCase()}`,
            value: isMax ? `${votes} vote${F.plural(votes)} ⇒ **__ↁ${allocatedCurrency[qtr]}__**` : `${votes} vote${F.plural(votes)} ⇒ ↁ${allocatedCurrency[qtr]}`,
            inline: true
        });
    }

    if (maxAlloc > 0) {
        embed.setFooter({
            text: `${raider.role.name} will win ↁ${maxAlloc} if they search in ${maxQtrs.map(qtr => `QTR ${qtr.toUpperCase()}`).join(" or ")}. If they search elsewhere, you instead will win ↁ${maxAlloc}.`
        })
    } else {
        embed.setFooter({ text: `No votes cast; no credits will be hidden. The attacker will take all ↁ${currencyAmount}.` })
    }

    return embed;
}

async function buildAttackEmbed(beingAttacked: District, qtrVotes: QtrAlloc): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Searching ${beingAttacked.role.name}`, iconURL: beingAttacked.imageUrl })
        .setColor(beingAttacked.role.color)
        .setDescription(`In reciprocity, I have deemed that the wealth harbored within ${roleMention(beingAttacked.role.id)} would better serve the Sacred Municipality of Dema under my stewardship. Thus, we shall embark on a raid upon one of their quarters at nightfall.`);

    const maxVotes = Math.max(...Object.values(qtrVotes));
    const maxQtrs = [];

    for (const [qtr, votes] of F.entries(qtrVotes)) {
        const isMax = votes === maxVotes;
        if (isMax) maxQtrs.push(qtr);
        embed.addFields({
            name: `${F.emoji(emojiIDs.quarters[qtr as keyof QtrAlloc])} Qtr. ${qtr.toUpperCase()}`,
            value: isMax ? `**__${votes}__** vote${F.plural(votes)}` : `${votes} vote${F.plural(votes)}`,
            inline: true
        });
    }

    if (maxVotes > 0) {
        const randomly = maxQtrs.length > 1 ? " (randomly) " : " ";
        embed.setFooter({
            text: `You will search ${maxQtrs.map(qtr => `QTR ${qtr.toUpperCase()}`).join(" or ")}${randomly}in ${beingAttacked.role.name}. If it has the most credits, you will win the credits hidden there.`
        })
    } else {
        embed.setFooter({ text: `No votes cast; no search will be made. The defender will keep all of their credits.` })
    }

    return embed;
}

export async function districtCron() {
    const results = await concludePreviousBattle();

    const newBattleGroup = await prisma.districtBattleGroup.create({ data: {} });
    const districts = await dailyDistrictOrder(newBattleGroup.id);

    // This will probably be randomized per day
    const currencyAmount = 50;

    const battles = [];
    for (let i = 0; i < districts.length; i++) {
        const prevDistrict = districts.at(i - 1)!;
        const district = districts[i];

        const battle = await prisma.districtBattle.create({
            data: {
                battleGroupId: newBattleGroup.id,
                attacker: prevDistrict.bishopType,
                defender: district.bishopType,
                credits: currencyAmount,
            }
        });

        battles.push(battle);
    }

    for (let i = 0; i < districts.length; i++) {
        const prevDistrict = districts.at(i - 1)!;
        const district = districts[i];
        const nextDistrict = districts[(i + 1) % districts.length];

        const battleWhereDefending = battles[i];
        const battleWhereAttacking = battles[(i + 1) % districts.length];

        const districtResults = results[district.bishopType];

        const defenseResults = (() => {
            const defense = districtResults?.defense;
            if (!defense || defense.credits === 0) return "_Nothing happened yesterday_";

            const won = defense.credits > 0;
            if (won) {
                const searchedIn = defense.attackedQtr ? `They unsuccessfully searched in QTR ${["I", "II", "III", "IV"][defense.attackedQtr]}` : "They did not select a quarter to attack.";
                return `**ↁ${defense.credits}** credits were successfully defended from the raiding party from DST. ${defense.attacker.toUpperCase()}. ${searchedIn}`;
            } else {
                return `The raiding party from DST. ${defense.attacker.toUpperCase()} successfully seized all **ↁ${defense.credits}** credits from QTR ${["I", "II", "III", "IV"][defense.attackedQtr]}. You have failed me.`
            }
        })();

        const offenseResults = (() => {
            const offense = districtResults?.offense;
            if (!offense || offense.credits === 0) return "_Nothing happened yesterday_";

            const won = offense.credits > 0;
            if (offense.attackedQtr === undefined) {
                return `We did not select a quarter to attack, so we lost all **ↁ${Math.abs(offense.credits)}** credits. You have failed me.`
            } else if (won) {
                return `We successfully seized **ↁ${offense.credits}** credits from QTR ${["I", "II", "III", "IV"][offense.attackedQtr]} of DST. ${offense.defender.toUpperCase()}.`;
            } else {
                return `We searched in QTR ${["I", "II", "III", "IV"][offense.attackedQtr]} of DST. ${offense.defender.toUpperCase()}, but found nothing. It seems they hid **ↁ${Math.abs(offense.credits)}** credits in QTR ${["I", "II", "III", "IV"][offense.defenseQtrs[0]]}. You have failed me.`
            }
        })();

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Announcement from ${district.name.toUpperCase()}`, iconURL: district.imageUrl })
            .setTitle(format(new Date(), "YYY MM'MOON' dd"))
            .setColor(district.role.color)
            .setDescription(`Good morning, my faithful citizens. Today, I bestow upon you a blessing of **ↁ${currencyAmount}** in credits.`)
            .addFields([
                {
                    name: "Yesterday's Defense",
                    value: defenseResults
                },
                {
                    name: "Yesterday's Offense",
                    value: offenseResults
                }
            ])
            .setFooter({ text: "See the pinned message in #glorious-vista for how to play" });

        const defendingEmbed = await buildDefendingEmbed(prevDistrict, currencyAmount, await getQtrAlloc(newBattleGroup.id, district.bishopType, false));
        const attackingEmbed = await buildAttackEmbed(nextDistrict, await getQtrAlloc(newBattleGroup.id, nextDistrict.bishopType, true));

        const defendingMenu = new StringSelectMenuBuilder()
            .setCustomId(genDefendId({ districtBattleId: battleWhereDefending.id }))
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
            .setCustomId(genAttackId({ districtBattleId: battleWhereAttacking.id }))
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

    // The user's district is the defender in the battle group returned above
    const thisDistrictBishop = result.dailyDistrictBattle.defender;

    // We want to find the battle in which the user's district is the attacker
    const districts = await dailyDistrictOrder(result.dailyDistrictBattle.battleGroupId);
    const thisDistrictIndex = districts.findIndex(b => b.bishopType === thisDistrictBishop);
    if (thisDistrictIndex === -1) throw new CommandError("District not found");

    const thisDistrict = districts[thisDistrictIndex];
    const beingAttacked = districts[(thisDistrictIndex + 1) % districts.length];

    const newAttackEmbed = await buildAttackEmbed(beingAttacked, await getQtrAlloc(result.dailyDistrictBattle.battleGroupId, thisDistrict.bishopType, true));
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

    // The user's district is the defender in the battle group returned above
    const thisDistrictBishop = result.dailyDistrictBattle.defender;
    const raiderBishop = result.dailyDistrictBattle.attacker;

    // Get District being defended (user's district)
    const districts = await dailyDistrictOrder(result.dailyDistrictBattle.battleGroupId);
    const thisDistrict = districts.find(b => b.bishopType === thisDistrictBishop);
    const raider = districts.find(b => b.bishopType === raiderBishop);
    if (!thisDistrict || !raider) throw new CommandError("District not found");

    const newDefendEmbed = await buildDefendingEmbed(raider, result.dailyDistrictBattle.credits, await getQtrAlloc(result.dailyDistrictBattle.battleGroupId, thisDistrict.bishopType, false));
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
