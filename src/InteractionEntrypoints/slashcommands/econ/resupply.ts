import { DailyBox, User } from "@prisma/client";
import { channelIDs, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { format } from "date-fns";
import {
    EmojiIdentifierResolvable,
    GuildMember,
    Message,
    ActionRowComponent,
    ButtonComponent,
    MessageComponentInteraction,
    Embed,
    MessageSelectMenu,
    MessageSelectOptionData,
    SelectMenuInteraction
} from "discord.js/packages/discord.js";
import fs from "fs";
import F from "../../../Helpers/funcs";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { District, districts, getPrizeName, ItemDescriptions, PrizeType } from "./_consts";
import { sendViolationNotice } from "../../../Helpers/dema-notice";

const command = new SlashCommand(<const>{
    description: "Using a daily token, search one of the Bishop's districts for supplies (credits, roles, etc.)",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const buffer = await fs.promises.readFile("./src/Assets/images/banditos.gif");

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { dailyBox: true });
    const tokens = dbUser.dailyBox?.tokens;

    if (!tokens) throw new CommandError("You don't have any tokens! Use the `/econ daily` command to get some.");

    const wrapXML = (xml: string) => `\`\`\`xml\n${xml}\n\`\`\``;

    // prettier-ignore
    const description = wrapXML([ 
            `<SYSTEM> Uplink established successfully at ${format(new Date(), "k:mm 'on' d MMMM yyyy")}.`,
            "<SYSTEM> B4ND170S connected from 153.98.64.214. Connection unstable.",
            "<B4ND170S> We have &eft suppl&es%^round DEMA. Yo> must evade them;.. You cannot get?caught."
        ].join("\n\n")
    );

    const embed = new Embed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setTitle("Connected via Vulture VPN<:eastisup_super:860624273457414204>")
        .addField(
            "**Tokens**",
            `You have ${tokens} token${tokens === 1 ? "" : "s"} available. A token is used when searching a district.`
        )
        .addField("**CONSOLE**", description)
        .setColor(0xfce300)
        .setThumbnail("attachment://file.gif")
        .setFooter(
            `Choose a district. The further down the list, the higher the potential prize, but the chances of getting "caught" by the Bishop is also higher.`
        );

    const options: MessageSelectOptionData[] = districts.map((d, idx) => ({
        label: `DST. ${d.bishop.toUpperCase()}`,
        description: `Search ${d.bishop}'s district. ${d.difficulty}.`,
        value: `${idx}`,
        emoji: { id: d.emoji } as EmojiIdentifierResolvable
    }));

    const menu = new MessageSelectMenu()
        .addOptions(options)
        .setPlaceholder("Select a district to search")
        .setCustomId(genSelectId({}));

    const actionRow = new ActionRowComponent().addComponents(menu);

    const buttonActionRow = new ActionRowComponent().addComponents(
        new ButtonComponent({
            label: "View Supply List",
            customId: genButtonId({}),
            style: "PRIMARY"
        })
    );

    await ctx.editReply({
        embeds: [embed.toJSON()],
        files: [{ name: "file.gif", attachment: buffer }],
        components: [actionRow, buttonActionRow]
    });
});

const genSelectId = command.addInteractionListener("banditosBishopsSelect", [], async (ctx) => {
    if (!ctx.isSelectMenu() || !ctx.member) return;

    await ctx.deferUpdate();

    const [_districtNum] = ctx.values || [];
    if (!_districtNum) return;

    const districtNum = +_districtNum;
    const district = districts[districtNum];

    await sendWaitingMessage(ctx, `Searching ${district.bishop}'s district...`);
    await F.wait(1500);

    const dbUser = await queries.findOrCreateUser(ctx.member.id, { dailyBox: true });
    const tokens = dbUser.dailyBox?.tokens;
    if (!dbUser.dailyBox || !tokens) return ctx.deleteReply();

    await prisma.dailyBox.update({
        where: { userId: ctx.member.id },
        data: { tokens: { decrement: 1 } }
    });

    const CHANCE_CAUGHT = District.catchPercent(districtNum);

    const ran = Math.random();
    const isCaught = ran < CHANCE_CAUGHT;

    if (isCaught) return memberCaught(ctx, district, dbUser.dailyBox);
    else return memberWon(ctx, district, dbUser as User & { dailyBox: DailyBox });
});

const genButtonId = command.addInteractionListener("banditosBishopsButton", [], async (ctx) => {
    await ctx.deferUpdate();
    await sendWaitingMessage(ctx, "Downloading `supplyList.txt` from `B@ND1?0S`...");
    await F.wait(1500);

    const embed = new Embed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor(0xfce300)
        .setThumbnail("attachment://file.gif")
        .setFooter(
            "Notice: This command and all related media is run solely by the Discord Clique and has no affiliation with or sponsorship from the band. DEMAtronix™ is a trademark of The Sacred Municipality of Dema."
        );

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

        // const expectedValue = (1 - District.catchPercent(i)) * creditsPrize.percent * creditsPrize.amount;

        const catchRate = District.convPercent(District.catchPercent(i));

        embed.addField(`${emoji} ${bishop}`, `**Catch Rate:** \`${catchRate}\` \n\n${prizeStr}\n\u200b`);
    }

    for (const [item, description] of Object.entries(ItemDescriptions)) {
        embed.addField(`What is a ${item.toLowerCase()}?`, description, true);
    }

    await ctx.editReply({ embeds: [embed], components: [] });
});

async function memberCaught(
    ctx: SelectMenuInteraction,
    district: typeof districts[number],
    dailyBox: DailyBox
): Promise<void> {
    // await (<Message>ctx.message).removeAttachments();

    const emojiURL = `https://cdn.discordapp.com/emojis/${district.emoji}.png?v=1`;
    const tokensRemaining = `${dailyBox.tokens - 1} token${dailyBox.tokens === 2 ? "" : "s"} remaining.`;

    const embed = new Embed()
        .setColor(0xea523b)
        .setTitle(`VIOLATION DETECTED BY ${district.bishop.toUpperCase()}`)
        .setAuthor(district.bishop, emojiURL)
        .setDescription(
            `You have been found in violation of the laws set forth by The Sacred Municipality of Dema. The <#${channelIDs.demacouncil}> has published a violation notice.`
        )
        .setFooter(`You win nothing. ${tokensRemaining}`, "attachment://file.gif");

    sendViolationNotice(ctx.member as GuildMember, {
        violation: "ConspiracyAndTreason",
        issuingBishop: district.bishop
    });

    await ctx.editReply({
        embeds: [embed],
        components: [],
        files: []
    });
}

async function memberWon(
    ctx: SelectMenuInteraction,
    district: typeof districts[number],
    dbUserWithBox: User & { dailyBox: DailyBox }
) {
    const prize = district.pickPrize();
    const tokensRemaining = `${dbUserWithBox.dailyBox.tokens} token${
        dbUserWithBox.dailyBox.tokens === 1 ? "" : "s"
    } remaining`;
    const member = ctx.member as GuildMember;

    let prizeDescription = `You now have ${dbUserWithBox.credits} credits.`;
    switch (prize.type) {
        case PrizeType.Credits:
            dbUserWithBox.credits += prize.amount;
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

    const embed = new Embed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor(0xfce300)
        .setThumbnail("attachment://file.gif")
        .setTitle(`You found a ${prizeName}!`)
        .setDescription(prizeDescription)
        .setFooter(tokensRemaining);

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
    const originalEmbed = reply.embeds[0];
    originalEmbed.fields = [];
    originalEmbed
        .setDescription(description)
        .addField(
            "**WARNING**",
            "DEMAtronix™ is not responsible for messages sent through this encrypted channel. The Sacred Municipality of Dema forbids any treasonous communication and will prosecute to the fullest extent of the law."
        )
        .setFooter(
            "Thank you for using DEMAtronix™ Telephony System. For any connection issues, please dial 1-866-VIALISM."
        )
        .setThumbnail("attachment://file.gif");

    await interaction.editReply({ components: [], embeds: [originalEmbed] });
}

export default command;
