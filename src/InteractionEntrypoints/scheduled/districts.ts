import { format } from "date-fns";
import { ActionRowBuilder, Colors, EmbedBuilder, StringSelectMenuBuilder, ThreadAutoArchiveDuration } from "discord.js";
import { emojiIDs, roles } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { buildAttackEmbed, buildDefendingEmbed, concludePreviousBattle, dailyDistrictOrder, getQtrAlloc, numeral, qtrEmoji } from "./districts.consts";
import Cron from "croner";

const entrypoint = new ManualEntrypoint();

Cron("0 20 * * *", { timezone: "Europe/Amsterdam" }, districtCron);

export async function districtCron() {
    const [results, thread] = await concludePreviousBattle();

    const newBattleGroup = await prisma.districtBattleGroup.create({ data: {} });
    const districts = await dailyDistrictOrder(newBattleGroup.id);

    // This will probably be randomized per day
    const currencyAmount = 50;

    const battlesEmbed = new EmbedBuilder()
        .setTitle("Today's Battles")
        .setColor(Colors.Blurple)

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

        battlesEmbed.addFields({
            name: `⚔️ ${prevDistrict.role.name.toUpperCase()}`,
            value: `🛡️ ${district.role.name.toUpperCase()}`
        });

        battles.push(battle);
    }

    if (thread) await thread.send({ embeds: [battlesEmbed] });

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
                const searchedIn = defense.attackedQtr >= 0 ? `They unsuccessfully searched in ${qtrEmoji(defense.attackedQtr)} QTR ${numeral(defense.attackedQtr)?.toUpperCase()}` : "They did not select a quarter to attack.";
                return `**ↁ${defense.credits}** credits were successfully defended from the raiding party from DST. ${defense.attacker.toUpperCase()}. ${searchedIn}`;
            } else {
                return `The raiding party from DST. ${defense.attacker.toUpperCase()} successfully seized all **ↁ${Math.abs(defense.credits)}** credits from ${qtrEmoji(defense.attackedQtr)} QTR ${numeral(defense.attackedQtr)?.toUpperCase()}. You have failed me.`
            }
        })();

        const offenseResults = (() => {
            const offense = districtResults?.offense;
            if (!offense || offense.credits === 0) return "_Nothing happened yesterday_";

            const won = offense.credits > 0;
            if (offense.attackedQtr < 0) {
                return `We did not select a quarter to attack, so we lost all **ↁ${Math.abs(offense.credits)}** credits. You have failed me.`
            } else if (won) {
                return `We successfully seized **ↁ${offense.credits}** credits from ${qtrEmoji(offense.attackedQtr)} QTR ${numeral(offense.attackedQtr)?.toUpperCase()} of DST. ${offense.defender.toUpperCase()}.`;
            } else {
                return `We searched in ${qtrEmoji(offense.attackedQtr)} QTR ${numeral(offense.attackedQtr)?.toUpperCase()} of DST. ${offense.defender.toUpperCase()}, but found nothing. It seems they hid **ↁ${Math.abs(offense.credits)}** credits in ${qtrEmoji(offense.defenseQtrs[0])} QTR ${numeral(offense.defenseQtrs[0])?.toUpperCase()}. You have failed me.`
            }
        })();

        const creditsWon = Math.max(districtResults?.offense.credits || 0, 0) + Math.max(districtResults?.defense.credits || 0, 0);
        const creditsMsg = creditsWon === 0
            ? "You have failed me."
            : creditsWon > 50 ? "You have surpassed my expectations." : "You have done adequately.";

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Announcement from ${district.name.toUpperCase()}`, iconURL: district.imageUrl })
            .setTitle(format(new Date(), "YYY MM'MOON' dd"))
            .setColor(district.role.color)
            .setDescription(`Good morning, my faithful citizens. Yesterday, you managed to secure **ↁ${creditsWon}** credit${F.plural(creditsWon)}. ${creditsMsg}`)
            .addFields([
                {
                    name: "Yesterday's Defense",
                    value: defenseResults
                },
                {
                    name: "Yesterday's Offense",
                    value: offenseResults
                },
                {
                    name: "Today's Blessing",
                    value: `Today, I bestow upon you a blessing of **ↁ${currencyAmount}** in credits. Protect it with your lives.`
                }
            ])
            .setFooter({ text: "See the pinned message in #glorious-vista for how to play" });

        const defendingEmbed = await buildDefendingEmbed(prevDistrict, currencyAmount, await getQtrAlloc(newBattleGroup.id, district.bishopType, false));
        const attackingEmbed = await buildAttackEmbed(nextDistrict, await getQtrAlloc(newBattleGroup.id, nextDistrict.bishopType, true));

        const defendingMenu = new StringSelectMenuBuilder()
            .setCustomId(genDefendId({ districtBattleId: battleWhereDefending.id }))
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`🛡️ Hide from ${prevDistrict.role.name.toUpperCase()}`)
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
            .setPlaceholder(`⚔️ Search in ${nextDistrict.role.name.toUpperCase()}`)
            .setOptions([
                { label: "Attack QTR I", value: "0", emoji: { id: emojiIDs.quarters.i } },
                { label: "Attack QTR II", value: "1", emoji: { id: emojiIDs.quarters.ii } },
                { label: "Attack QTR III", value: "2", emoji: { id: emojiIDs.quarters.iii } },
                { label: "Attack QTR IV", value: "3", emoji: { id: emojiIDs.quarters.iv } }
            ]);

        const defendingActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(defendingMenu);
        const attackingActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(attackingMenu);

        const lastApiMsg = await district.webhook.client.send({ embeds: [embed, attackingEmbed, defendingEmbed], components: [attackingActionRow, defendingActionRow], allowedMentions: { parse: [] } });
        const lastMsg = await district.webhook.webhook.fetchMessage(lastApiMsg.id);

        const thread = await lastMsg.startThread({
            name: `${format(new Date(), "YYY MM'MOON' dd")} 🛡️ ${prevDistrict.role.name} / ⚔️ ${nextDistrict.role.name}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        });

        await thread.send("Discuss the battle here. Remember to vote in the select menus above.");
    }
}

const genAttackId = entrypoint.addInteractionListener("districtAttackSel", ["districtBattleId"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu()) return;
    await ctx.deferUpdate();

    // Staff can't vote
    if (ctx.member.roles.cache.has(roles.staff)) {
        throw new CommandError("Staff cannot vote in district battles.");
    }

    const districtBattle = await prisma.districtBattle.findUnique({
        where: {
            id: args.districtBattleId
        }
    });

    if (!districtBattle) throw new CommandError("District battle not found");

    // Make sure they actually belong to the district
    const thisDistrictBishop = districtBattle.attacker;
    console.log(`Attacking: ${F.userBishop(ctx.member)?.bishop} | ${thisDistrictBishop}`);
    if (F.userBishop(ctx.member)?.bishop !== thisDistrictBishop) throw new CommandError("This is not your district.");

    // Record the vote
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

    // We want to find the battle in which the user's district is the attacker
    const districts = await dailyDistrictOrder(result.dailyDistrictBattle.battleGroupId);
    const thisDistrictIndex = districts.findIndex(b => b.bishopType === thisDistrictBishop);
    if (thisDistrictIndex === -1) throw new CommandError("District not found");

    const thisDistrict = districts[thisDistrictIndex];
    const beingAttacked = districts[(thisDistrictIndex + 1) % districts.length];

    const newAttackEmbed = await buildAttackEmbed(beingAttacked, await getQtrAlloc(result.dailyDistrictBattle.battleGroupId, thisDistrict.bishopType, true));

    const embeds = ctx.message.embeds.map(e => new EmbedBuilder(e.toJSON()));
    embeds.splice(1, 1, newAttackEmbed);
    await ctx.editReply({ embeds });

    const emojiId = Object.values(emojiIDs.quarters)[qtrIndex];
    await ctx.followUp({
        content: `You selected ${F.emoji(emojiId)} QTR ${numeral(qtrIndex)?.toUpperCase()}`,
        ephemeral: true
    });
});

const genDefendId = entrypoint.addInteractionListener("districtDefendSel", ["districtBattleId"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu()) return;
    await ctx.deferUpdate();

    // Staff can't vote
    if (ctx.member.roles.cache.has(roles.staff)) {
        throw new CommandError("Staff cannot vote in district battles.");
    }

    const districtBattle = await prisma.districtBattle.findUnique({
        where: {
            id: args.districtBattleId
        }
    });

    if (!districtBattle) throw new CommandError("District battle not found");

    const thisDistrictBishop = districtBattle.defender;
    const raiderBishop = districtBattle.attacker;

    // Make sure they actually belong to the district
    console.log(`Attacking: ${F.userBishop(ctx.member)?.bishop} | ${thisDistrictBishop}`);
    if (F.userBishop(ctx.member)?.bishop !== thisDistrictBishop) throw new CommandError("This is not your district.");

    // Record the vote
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

    // Get District being defended (user's district)
    const districts = await dailyDistrictOrder(result.dailyDistrictBattle.battleGroupId);
    const thisDistrict = districts.find(b => b.bishopType === thisDistrictBishop);
    const raider = districts.find(b => b.bishopType === raiderBishop);
    if (!thisDistrict || !raider) throw new CommandError("District not found");

    const newDefendEmbed = await buildDefendingEmbed(raider, result.dailyDistrictBattle.credits, await getQtrAlloc(result.dailyDistrictBattle.battleGroupId, thisDistrict.bishopType, false));
    const embeds = ctx.message.embeds.map(e => new EmbedBuilder(e.toJSON()));
    embeds.splice(2, 1, newDefendEmbed);
    await ctx.editReply({ embeds });

    const emojiId = Object.values(emojiIDs.quarters)[qtrIndex];
    await ctx.followUp({
        content: `You selected ${F.emoji(emojiId)} QTR ${numeral(qtrIndex)?.toUpperCase()}`,
        ephemeral: true
    });
});

export default entrypoint;
