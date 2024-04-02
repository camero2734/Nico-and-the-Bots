import { BishopType, DailyBox, User } from "@prisma/client";
import { format } from "date-fns";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    GuildMember,
    Message,
    MessageComponentInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder
} from "discord.js";
import fs from "fs";
import { roles } from "../../../Configuration/config";
import { sendViolationNotice } from "../../../Helpers/dema-notice";
import F from "../../../Helpers/funcs";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { District, ItemDescriptions, PrizeType, districts, getPrizeName } from "./_consts";

const command = new SlashCommand({
    description: "Using a daily token, search one of the Bishop's districts for supplies (credits, roles, etc.)",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const buffer = await fs.promises.readFile("./src/Assets/images/banditos.gif");

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { dailyBox: true });
    const tokens = dbUser.dailyBox?.tokens;

    const wrapCode = (code: string) => `\`\`\`yml\n${code}\n\`\`\``;

    const userBishop = F.userBishop(ctx.member);

    const bishop = F.capitalize(userBishop?.name || F.randomValueInArray(F.keys(roles.districts)));

    // prettier-ignore
    const description = wrapCode([
        `<DemaOS/Guest>: Welcome to DEMAtronix™ Telephony System. You have ${tokens} token${tokens === 1 ? "" : "s"} token available for use. Unauthorized access is strictly prohibited.`,
        `\tbanditos.exe: Rerouting connection through Vulture VPN...`,
        `\tvvpn.exe: Uplink established successfully at ${format(new Date(), "k:mm 'on' d MMMM yyyy")}.`,
        `\tbanditos.exe: Granting admin access...`,
        `<DemaOS/Admin>: Welcome, ${bishop}!`,
        `\tbishops.exe: Accessing district supply lists... Please make a selection.`,
    ].join("\n")
    );

    const embed = new EmbedBuilder()
        .setAuthor({ name: "DEMAtronix™ Telephony System", iconURL: "https://i.imgur.com/csHALvp.png" })
        .setTitle("Connected via Vulture VPN<:eastisup_super:860624273457414204>")
        .addFields([{
            name: "**Tokens**",
            value: `You have ${tokens} token${tokens === 1 ? "" : "s"
                } available. A token is used when searching a district.`
        }])
        .addFields([{ name: "**CONSOLE**", value: description }])
        .setColor(0xfce300)
        .setThumbnail("attachment://file.gif")
        .setFooter({
            text: `Choose a district. The further down the list, the higher the potential prize, but the chances of getting "caught" by the Bishop is also higher.`
        });

    const options = districts.map(
        (d, idx) => {
            const bishopName = d.bishop;
            const prefix = userBishop?.name === bishopName ? "📍 " : " ";
            const homeDistrict = userBishop?.name === bishopName ? " (Your District)" : "";
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${prefix}DST. ${bishopName.toUpperCase()}`)
                .setDescription(`Search ${F.capitalize(bishopName)}'s district${homeDistrict}. ${d.difficulty}.`)
                .setValue(idx.toString())
                .setEmoji({ id: d.emoji })
        }
    );

    const menu = new StringSelectMenuBuilder()
        .addOptions(options)
        .setPlaceholder("Select a district to search")
        .setCustomId(genSelectId({ matchingBishop: bishop }));

    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([menu]);

    const buttonActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
        new ButtonBuilder().setLabel("View Supply List").setCustomId(genButtonId({})).setStyle(ButtonStyle.Primary)
    ]);

    await ctx.editReply({
        embeds: [embed],
        files: [{ name: "file.gif", attachment: buffer }],
        components: [actionRow, buttonActionRow]
    });
});

const genSelectId = command.addInteractionListener("banditosBishopsSelect", ["matchingBishop"], async (ctx, args) => {
    if (!ctx.isStringSelectMenu() || !ctx.member) return;

    await ctx.deferUpdate();

    const districtNum = Number(ctx.values.at(0));
    if (isNaN(districtNum)) return;

    const district = districts[districtNum];

    await sendWaitingMessage(ctx, `Searching ${district.bishop}'s district...`);
    await F.wait(1500);

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { dailyBox: true });
    const tokens = dbUser.dailyBox?.tokens;
    if (!dbUser.dailyBox || !tokens || tokens < 1) {
        const embed = new EmbedBuilder()
            .setDescription("You don't have any tokens! Use the `/econ daily` command to get some.")
            .setThumbnail("attachment://file.gif");
        await ctx.editReply({
            embeds: [embed],
            components: []
        });
        return;
    }

    await prisma.dailyBox.update({
        where: { userId: ctx.member.id },
        data: { tokens: { decrement: 1 } }
    });

    const CHANCE_CAUGHT = District.catchPercent(districtNum);

    let ran = Math.random();
    if (district.bishop === args.matchingBishop) {
        ran = Math.max(ran, Math.random());
    }

    const isCaught = ran < CHANCE_CAUGHT;

    if (isCaught) return memberCaught(ctx, district, dbUser.dailyBox);
    else return memberWon(ctx, district, dbUser as User & { dailyBox: DailyBox });
});

const genButtonId = command.addInteractionListener("banditosBishopsButton", [], async (ctx) => {
    if (!ctx.isButton()) return;

    await ctx.deferUpdate();
    await sendWaitingMessage(ctx, "Downloading `supplyList.txt`...");
    await F.wait(1500);

    const embed = new EmbedBuilder()
        .setAuthor({ name: "DEMAtronix™ Telephony System", iconURL: "https://i.imgur.com/csHALvp.png" })
        .setColor(0xfce300)
        .setThumbnail("attachment://file.gif")
        .setFooter({
            text: "Notice: This command and all related media is run solely by the Discord Clique and has no affiliation with or sponsorship from the band. DEMAtronix™ is a trademark of The Sacred Municipality of Dema."
        });

    for (let i = 0; i < districts.length; i++) {
        const district = districts[i];
        const bishop = district.bishop;
        const emoji = `<:emoji:${district.emoji}>`;

        const creditsPrize = district.getCreditsPrize();
        // Prize types
        const prizes = [creditsPrize, ...district.getAllPrizes()].sort((a, b) => b.percent - a.percent);

        const prizeStrings: string[] = [];
        for (const prize of prizes) {
            const chance = District.convPercent(prize.percent);
            const prizeName = getPrizeName(prize);
            prizeStrings.push(`\`${chance}\` for a ${prizeName}`);
        }

        const prizeStr = prizeStrings.map((p) => `➼ ${p}`).join("\n");

        const catchRate = District.convPercent(District.catchPercent(i));

        embed.addFields([{
            name: `${emoji} ${bishop}`,
            value: `**Catch Rate:** \`${catchRate}\` \n\n${prizeStr}\n\u200b`
        }]);
    }

    for (const [item, description] of Object.entries(ItemDescriptions)) {
        embed.addFields([{ name: `What is a ${item.toLowerCase()}?`, value: description, inline: true }]);
    }

    await ctx.editReply({ embeds: [embed], components: [] });
});

async function memberCaught(
    ctx: StringSelectMenuInteraction,
    district: typeof districts[number],
    dailyBox: DailyBox
): Promise<void> {
    const issuingBishop = F.capitalize(district.bishop) as BishopType;
    const emojiURL = `https://cdn.discordapp.com/emojis/${district.emoji}.png?v=1`;
    const tokensRemaining = `${dailyBox.tokens - 1} token${dailyBox.tokens === 2 ? "" : "s"} remaining.`;

    const embed = new EmbedBuilder()
        .setColor(0xea523b)
        .setTitle(`VIOLATION DETECTED BY ${issuingBishop.toUpperCase()}`)
        .setAuthor({ name: issuingBishop, iconURL: emojiURL })
        .setDescription(
            `You have been found in violation of the laws set forth by The Sacred Municipality of Dema. The Dema Council has published a violation notice.`
        )
        .setFooter({ text: `You win nothing. ${tokensRemaining}`, iconURL: "attachment://file.gif" });

    sendViolationNotice(ctx.member as GuildMember, {
        violation: "ConspiracyAndTreason",
        issuingBishop: issuingBishop
    });

    await ctx.editReply({
        embeds: [embed],
        components: [],
        files: []
    });
}

async function memberWon(
    ctx: StringSelectMenuInteraction,
    district: typeof districts[number],
    dbUserWithBox: User & { dailyBox: DailyBox }
) {
    const prize = district.pickPrize();
    const tokensRemaining = `${dbUserWithBox.dailyBox.tokens} token${dbUserWithBox.dailyBox.tokens === 1 ? "" : "s"
        } remaining`;
    const member = ctx.member as GuildMember;

    let prizeDescription = `You now have ${dbUserWithBox.credits} credits.`;
    switch (prize.type) {
        case PrizeType.Credits:
            dbUserWithBox.credits += prize.amount;
            prizeDescription = `You now have ${dbUserWithBox.credits} credits.`;
            break;
        case PrizeType.Role: {
            const isColorRole = Object.values(roles.colors).some((group) => Object.values(group).some((id) => id === prize.id)); // prettier-ignore
            if (isColorRole) {
                await prisma.colorRole.upsert({
                    where: { roleId_userId: { roleId: prize.id, userId: member.id } },
                    update: {},
                    create: { amountPaid: 0, roleId: prize.id, userId: member.id }
                });

                prizeDescription = `You may equip this role using the \`/roles colors\` command.`;
            } else await member.roles.add(prize.id);
            break;
        }
        case PrizeType.Item: {
            if (prize.item === "BOUNTY") {
                dbUserWithBox.dailyBox.steals++;
                prizeDescription =
                    "A `Bounty` may be used against another member of the server to report them to the Bishops. If they do not have a `Jumpsuit`, they will receive a violation notice and you will receive 1000 credits as the bounty reward";
            } else if (prize.item === "JUMPSUIT") {
                dbUserWithBox.dailyBox.blocks++;
                prizeDescription =
                    "A `Jumpsuit` will protect you if another member sends the Bishops after you with a `Bounty`. It will prevent the Bishops from finding you, effectively cancelling their `Bounty`.";
            }
            break;
        }
    }

    const prizeName = getPrizeName(prize);

    const embed = new EmbedBuilder()
        .setAuthor({ name: "DEMAtronix™ Telephony System", iconURL: "https://i.imgur.com/csHALvp.png" })
        .setColor(0xfce300)
        .setThumbnail("attachment://file.gif")
        .setTitle(`You found a ${prizeName}!`)
        .setDescription(prizeDescription)
        .setFooter({ text: tokensRemaining });

    const { steals, blocks } = dbUserWithBox.dailyBox;
    await prisma.user.update({
        where: { id: member.id },
        data: { credits: dbUserWithBox.credits, dailyBox: { update: { steals, blocks } } }
    });

    await ctx.editReply({
        embeds: [embed],
        components: []
    });
}

async function sendWaitingMessage(interaction: MessageComponentInteraction, description: string) {
    const reply = (await interaction.fetchReply()) as Message;
    const originalEmbed = EmbedBuilder.from(reply.embeds[0]);
    originalEmbed.setFields([]);
    originalEmbed
        .setDescription(description)
        .addFields([{
            name: "**WARNING**",
            value: "DEMAtronix™ is not responsible for messages sent through this encrypted channel. The Sacred Municipality of Dema forbids any treasonous communication and will prosecute to the fullest extent of the law."
        }])
        .setFooter({
            text: "Thank you for using DEMAtronix™ Telephony System. For any connection issues, please dial 1-866-VIALISM."
        })
        .setThumbnail("attachment://file.gif");

    await interaction.editReply({ components: [], embeds: [originalEmbed] });
}

export default command;
