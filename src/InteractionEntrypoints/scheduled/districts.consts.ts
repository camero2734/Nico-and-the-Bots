import { Faker, en } from "@faker-js/faker";
import { ChannelType, EmbedBuilder, Role, TextChannel, ThreadAutoArchiveDuration, roleMention } from "discord.js";
import { guild } from "../../../app";
import { channelIDs, emojiIDs, roles } from "../../Configuration/config";
import { WebhookData, getDistrictWebhookClient } from "../../Helpers/district-webhooks";
import F from "../../Helpers/funcs";
import { BishopType } from "@prisma/client";
import { prisma } from "../../Helpers/prisma-init";
import { format } from "date-fns";

export interface District {
    name: keyof typeof channelIDs["districts"];
    bishopType: BishopType;
    role: Role;
    channel: TextChannel;
    webhook: WebhookData;
    imageUrl: string;
}

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

interface QtrAlloc {
    i: number;
    ii: number;
    iii: number;
    iv: number;
}

export function numeral(idx: number) {
    return (<const>["i", "ii", "iii", "iv"]).at(idx);
}

export function qtrEmoji(idx: number) {
    const num = numeral(idx);
    if (!num) return "";

    return F.emoji(emojiIDs.quarters[num]);
}

export async function dailyDistrictOrder(battleId: number) {
    const faker = new Faker({ locale: [en] });
    faker.seed(F.hashToInt(`dist.battle.${battleId}`));

    // Determine which districts attack each other today. Forms a cycle.
    // 0 -> 1 -> 2 -> 3 -> ... -> 8 -> 9 -> 0
    const ranDistricts = faker.helpers.shuffle(F.entries(channelIDs.districts));

    const districts: District[] = await Promise.all(
        ranDistricts.map(async ([name, channelId]) => {
            const roleId = roles.districts[name];
            const role = await guild.roles.fetch(roleId);
            const channel = await guild.channels.fetch(channelId);

            if (!role || !channel || channel.type !== ChannelType.GuildText) {
                throw new Error(`Role or channel not found for ${name}`);
            }

            const webhook = await getDistrictWebhookClient(name, channel);
            const imageUrl = webhook.webhook.avatarURL({ size: 512, extension: "png" })!;
            const bishopType = F.capitalize(name) as BishopType;

            return {
                name,
                bishopType,
                role,
                channel,
                webhook,
                imageUrl
            };
        })
    );

    return districts;
}

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

        const creditAlloc = calculateAllocatedCurrency({ i: defenseTally[0], ii: defenseTally[1], iii: defenseTally[2], iv: defenseTally[3] }, battle.credits);
        let attackSuccess = defenseQtrs.includes(attackedQtr);
        let creditsWon = Math.max(...Object.values(creditAlloc));
        // If defender cast no votes, they lose all credits to the attacker
        if (maxDefenseVotes <= 0) {
            attackSuccess = true;
            creditsWon = battle.credits;
        }

        // If neither side cast votes, no one wins anything.
        if (maxAttackVotes <= 0 && maxDefenseVotes <= 0) creditsWon = 0;

        if (!results[attacker]) results[attacker] = {} as any;
        if (!results[defender]) results[defender] = {} as any;

        results[attacker]!.offense = {
            attackedQtr,
            defenseQtrs,
            credits: attackSuccess ? creditsWon : -creditsWon,
            attacker,
            defender
        };

        results[defender]!.defense = {
            attackedQtr,
            defenseQtrs,
            credits: attackSuccess ? -creditsWon : creditsWon,
            attacker,
            defender
        };
    }

    // Update the district balances
    for (const [bishop, result] of F.entries(results)) {
        const { offense, defense } = result || {};
        if (!offense || !defense) continue;

        const amount = (am: number) => am > 0 ? am : 0;

        await prisma.district.upsert({
            where: { name: bishop },
            update: {
                credits: {
                    increment: amount(offense.credits) + amount(defense.credits)
                }
            },
            create: {
                name: bishop,
                credits: amount(offense.credits) + amount(defense.credits)
            }
        });
    }

    // Send leaderboard update
    await sendLeaderboardUpdate();

    return results;
}

async function sendLeaderboardUpdate() {
    const channel = await guild.channels.fetch(channelIDs.gloriousVista);
    if (!channel?.isTextBased()) return;

    const botMember = await guild.members.fetch(guild.client.user.id);
    if (!botMember) return;

    const embed = new EmbedBuilder()
        .setTitle("Glorious Vista Daily Standings")
        .setDescription("Thank you to all loyal citizens for their hard work yesterday. Here are the standings:")
        .setColor(botMember.displayColor);

    const districts = await prisma.district.findMany({
        orderBy: { credits: "desc" }
    });

    for (let i = 0; i < districts.length; i++) {
        const { name, credits } = districts[i];
        const bishopName = name.toLowerCase() as keyof typeof roles["districts"];

        embed.addFields({
            name: `${i + 1}. ↁ${credits}`,
            value: roleMention(roles.districts[bishopName]),
            inline: true,
        });
    }

    const msg = await channel.send({ embeds: [embed] });

    const thread = await msg.startThread({
        name: `${format(new Date(), "YYY MM'MOON' dd")} District Standings`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay
    });

    await thread.send("Feel free to publicly discuss the standings or upcoming battle here. Do not share information about your district's strategy.");
}

export async function getQtrAlloc(battleId: number, defender: BishopType, isAttack: boolean): Promise<QtrAlloc> {
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
        const qtr = numeral(vote.quarter);
        if (!qtr) throw new Error("Invalid quarter vote");
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

export async function buildDefendingEmbed(raider: District, currencyAmount: number, qtrVotes: QtrAlloc): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `🛡️ Being raided by ${raider.role.name}`, iconURL: raider.imageUrl })
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

export async function buildAttackEmbed(beingAttacked: District, qtrVotes: QtrAlloc): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
        .setAuthor({ name: `⚔️ Searching ${beingAttacked.role.name}`, iconURL: beingAttacked.imageUrl })
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
