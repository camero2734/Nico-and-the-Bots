import { faker } from "@faker-js/faker";
import { BishopType } from "@prisma/client";
import Cron from "croner";
import { format } from "date-fns";
import { ActionRowBuilder, Colors, EmbedBuilder, StringSelectMenuBuilder, ThreadAutoArchiveDuration } from "discord.js";
import { emojiIDs, roles, userIDs } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { buildAttackEmbed, buildDefendingEmbed, concludePreviousBattle, dailyDistrictOrder, getQtrAlloc, numeral, qtrEmoji } from "./districts.consts";

const entrypoint = new ManualEntrypoint();

Cron("0 22 * * *", { timezone: "Europe/Amsterdam" }, districtCron);

export async function districtCron() {
    const [results, thread] = await concludePreviousBattle();

    const newBattleGroup = await prisma.districtBattleGroup.create({ data: {} });
    const districts = await dailyDistrictOrder(newBattleGroup.id);

    const currencyAmount = faker.number.int({ min: 3, max: 7 }) * 10;

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
                messageId: "",
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
            : creditsWon > battleWhereAttacking.credits ? "You have surpassed my expectations." : "You have done adequately.";

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

        // Update DB w/ message ID
        await prisma.districtBattle.update({
            where: { id: battleWhereDefending.id },
            data: { messageId: lastMsg.id }
        });

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

    // Admins can't vote
    if (ctx.member.roles.cache.has(roles.admin) && ctx.user.id !== userIDs.me) {
        throw new CommandError("Admins cannot vote in district battles.");
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

    const previousEmbeds = ctx.message.embeds.map(e => new EmbedBuilder(e.toJSON()));
    const embeds = await buildEmbeds(previousEmbeds, thisDistrictBishop, result.dailyDistrictBattle.battleGroupId);

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

    // Admins can't vote
    if (ctx.member.roles.cache.has(roles.admin) && ctx.user.id !== userIDs.me) {
        throw new CommandError("Admins cannot vote in district battles.");
    }

    const districtBattle = await prisma.districtBattle.findUnique({
        where: {
            id: args.districtBattleId
        }
    });

    if (!districtBattle) throw new CommandError("District battle not found");

    const thisDistrictBishop = districtBattle.defender;

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

    const previousEmbeds = ctx.message.embeds.map(e => new EmbedBuilder(e.toJSON()));
    const embeds = await buildEmbeds(previousEmbeds, thisDistrictBishop, result.dailyDistrictBattle.battleGroupId);

    await ctx.editReply({ embeds });

    const emojiId = Object.values(emojiIDs.quarters)[qtrIndex];
    await ctx.followUp({
        content: `You selected ${F.emoji(emojiId)} QTR ${numeral(qtrIndex)?.toUpperCase()}`,
        ephemeral: true
    });
});

async function buildEmbeds(previousEmbeds: EmbedBuilder[], district: BishopType, battleGroupId: number): Promise<EmbedBuilder[]> {
    const embeds = [];
    const announcement = previousEmbeds.find(x => x.data.author?.name?.includes("Announcement"));
    if (announcement) embeds.push(announcement);

    const { credits } = await prisma.districtBattle.findFirstOrThrow({
        where: { battleGroupId },
        select: { credits: true }
    });

    const districts = await dailyDistrictOrder(battleGroupId);
    const thisDistrictIdx = districts.findIndex(b => b.bishopType === district);

    const thisDistrict = districts[thisDistrictIdx];
    const raider = districts.at(thisDistrictIdx - 1);
    const defender = districts.at((thisDistrictIdx + 1) % districts.length);

    if (!raider || !thisDistrict || !defender) throw new CommandError("District not found");

    const attackingEmbed = await buildAttackEmbed(defender, await getQtrAlloc(battleGroupId, defender.bishopType, true));
    const defendingEmbed = await buildDefendingEmbed(raider, credits, await getQtrAlloc(battleGroupId, district, false));

    embeds.push(attackingEmbed, defendingEmbed);

    return embeds;
}

export default entrypoint;
