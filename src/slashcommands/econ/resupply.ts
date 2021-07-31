import { channelIDs, roles } from "configuration/config";
import { CommandComponentListener, CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Economy } from "database/entities/Economy";
import { format } from "date-fns";
import {
    EmojiIdentifierResolvable,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    MessageSelectMenu,
    MessageSelectOptionData,
    SelectMenuInteraction
} from "discord.js";
import fs from "fs";
import F from "helpers/funcs";
import { ComponentActionRow } from "slash-create";
import { Connection } from "typeorm";
import { Item } from "../../database/entities/Item";
import { sendViolationNotice } from "../../helpers/dema-notice";
import { District, districts, getPrizeName, ItemDescriptions, PrizeType } from "./_consts";

export const Options: CommandOptions = {
    description: "Using a daily token, search one of the Bishop's districts for supplies (credits, roles, etc.)",
    options: []
};

const answerListener = new CommandComponentListener("banditosBishopsSelect", []);
const buttonListener = new CommandComponentListener("banditosBishopsButton", []);
export const ComponentListeners: CommandComponentListener[] = [answerListener, buttonListener];

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer();

    const buffer = await fs.promises.readFile("src/assets/images/banditos.gif");

    const userEconomy = await ctx.connection.getRepository(Economy).findOne({ userid: ctx.member.id });
    const tokens = userEconomy?.dailyBox.tokens;

    if (!tokens) throw new CommandError("You don't have any tokens! Use the `/econ daily` command to get some.");

    const wrapXML = (xml: string) => `\`\`\`xml\n${xml}\n\`\`\``;

    // prettier-ignore
    const description = wrapXML([ 
            `<SYSTEM> Uplink established successfully at ${format(new Date(), "k:mm 'on' d MMMM yyyy")}.`,
            "<SYSTEM> B4ND170S connected from 153.98.64.214. Connection unstable.",
            "<B4ND170S> We have &eft suppl&es%^round DEMA. Yo> must evade them;.. You cannot get?caught."
        ].join("\n\n")
    );

    const embed = new MessageEmbed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setTitle("Connected via Vulture VPN<:eastisup_super:860624273457414204>")
        .addField(
            "**Tokens**",
            `You have ${tokens} token${tokens === 1 ? "" : "s"} available. A token is used when searching a district.`
        )
        .addField("**CONSOLE**", description)
        .setColor("#FCE300")
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

    console.log(options);

    const menu = new MessageSelectMenu()
        .addOptions(options)
        .setPlaceholder("Select a district to search")
        .setCustomId(answerListener.generateCustomID({}));

    const actionRow = new MessageActionRow().addComponents(menu).toJSON() as ComponentActionRow;

    const buttonActionRow = new MessageActionRow()
        .addComponents(
            new MessageButton({
                label: "View Supply List",
                customId: buttonListener.generateCustomID({}),
                style: "PRIMARY"
            })
        )
        .toJSON() as ComponentActionRow;

    await ctx.send({
        embeds: [embed.toJSON()],
        file: [{ name: "file.gif", file: buffer }],
        components: [actionRow, buttonActionRow]
    });
};

async function memberCaught(
    interaction: SelectMenuInteraction,
    connection: Connection,
    district: typeof districts[number],
    userEconomy: Economy
): Promise<void> {
    await (<Message>interaction.message).removeAttachments();

    const emojiURL = `https://cdn.discordapp.com/emojis/${district.emoji}.png?v=1`;
    const tokensRemaining = `${userEconomy.dailyBox.tokens} token${
        userEconomy.dailyBox.tokens === 1 ? "" : "s"
    } remaining`;

    const embed = new MessageEmbed()
        .setColor("#EA523B")
        .setTitle(`VIOLATION DETECTED BY ${district.bishop.toUpperCase()}`)
        .setAuthor(district.bishop, emojiURL)
        .setDescription(
            `You have been found in violation of the laws set forth by The Sacred Municipality of Dema. The <#${channelIDs.demacouncil}> has published a violation notice.`
        )
        .setFooter(`You win nothing. ${tokensRemaining}`);

    await sendViolationNotice(interaction.member as GuildMember, connection, {
        identifiedAs: "CONSPIRACY TO COMMIT TREASON",
        found: "trespassing while conspiring against the Dema Council",
        reason: `Unlawful access in DST. ${district.bishop.toUpperCase()}`,
        issuingBishop: district.bishop
    });

    await connection.manager.save(userEconomy);

    await interaction.editReply({
        embeds: [embed],
        components: []
    });
}

async function memberWon(
    interaction: SelectMenuInteraction,
    connection: Connection,
    district: typeof districts[number],
    userEconomy: Economy
) {
    const prize = district.pickPrize();
    const tokensRemaining = `${userEconomy.dailyBox.tokens} token${
        userEconomy.dailyBox.tokens === 1 ? "" : "s"
    } remaining`;
    const member = interaction.member as GuildMember;

    let prizeDescription = `You now have ${userEconomy.credits} credits.`;
    switch (prize.type) {
        case PrizeType.Credits:
            userEconomy.credits += prize.amount;
            break;
        case PrizeType.Role: {
            const isColorRole = Object.values(roles.colors).some((group) => Object.values(group).some((id) => id === prize.id)); // prettier-ignore
            if (isColorRole) {
                const colorRoleData = { identifier: member.id, type: "ColorRole", title: prize.id };
                const colorRole =  (await connection.getRepository(Item).findOne(colorRoleData)) || new Item(colorRoleData); // prettier-ignore
                await connection.manager.save(colorRole);
                prizeDescription = `You may equip this role using the \`/roles color\` command.`;
            } else await member.roles.add(prize.id);
            break;
        }
        case PrizeType.Item: {
            if (prize.item === "BOUNTY") {
                userEconomy.dailyBox.steals++;
                prizeDescription =
                    "A `Bounty` may be used against another member of the server to report them to the Bishops. If they do not have a `Jumpsuit`, they will receive a violation notice and you will receive 1000 credits as the bounty reward";
            } else if (prize.item === "JUMPSUIT") {
                userEconomy.dailyBox.blocks++;
                prizeDescription =
                    "A `Jumpsuit` will protect you if another member sends the Bishops after you with a `Bounty`. It will prevent the Bishops from finding you, effectively cancelling their `Bounty`.";
            }
            break;
        }
    }

    const prizeName = getPrizeName(prize);

    const embed = new MessageEmbed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor("#FCE300")
        .setThumbnail("attachment://file.gif")
        .setTitle(`You found a ${prizeName}!`)
        .setDescription(prizeDescription)
        .setFooter(tokensRemaining);

    await connection.manager.save(userEconomy);

    await interaction.editReply({
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

answerListener.handler = async (interaction, connection) => {
    const member = interaction.member as GuildMember;
    if (!interaction.isSelectMenu() || !member) return;
    interaction.deferred = true;

    const [_districtNum] = interaction.values || [];
    if (!_districtNum) return;

    const districtNum = +_districtNum;
    const district = districts[districtNum];

    await sendWaitingMessage(interaction, `Searching ${district.bishop}'s district...`);
    await F.wait(1500);

    const userEconomy = await connection.getRepository(Economy).findOne({ userid: member.id });
    const tokens = userEconomy?.dailyBox.tokens;
    if (!userEconomy || !tokens) return interaction.deleteReply();

    userEconomy.dailyBox.tokens--; // Take away a token

    const CHANCE_CAUGHT = District.catchPercent(districtNum);

    const ran = Math.random();
    const isCaught = ran < CHANCE_CAUGHT;

    if (isCaught) return memberCaught(interaction, connection, district, userEconomy);
    else return memberWon(interaction, connection, district, userEconomy);
};

buttonListener.handler = async (interaction) => {
    interaction.deferred = true;

    await sendWaitingMessage(interaction, "Downloading `supplyList.txt` from `B@ND1?0S`...");
    await F.wait(1500);

    const embed = new MessageEmbed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor("#FCE300")
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

    await interaction.editReply({ embeds: [embed.toJSON()], components: [] });
};
