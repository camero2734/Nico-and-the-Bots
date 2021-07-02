import { Canvas } from "canvas";
import { channelIDs, roles } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { format } from "date-fns";
import { Message, MessageAttachment } from "discord.js";
import {
    EmojiIdentifierResolvable,
    MessageActionRow,
    MessageEmbed,
    MessageSelectMenu,
    MessageSelectOptionData,
    Snowflake
} from "discord.js";
import fs from "fs";
import F from "helpers/funcs";
import * as R from "ramda";
import { CommandContext, CommandOptionType, ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Opens a box",
    options: [
        {
            name: "viewlist",
            type: CommandOptionType.BOOLEAN,
            description: "View the list of available supplies",
            required: false
        }
    ]
};

const districtOrder = <const>["Andre", "Lisden", "Keons", "Reisdro", "Sacarver", "Listo", "Vetomo", "Nills", "Nico"];

enum PrizeType {
    Credits,
    Role,
    Badge,
    Item
}

type ItemType = "BOUNTY" | "JUMPSUIT";

const ItemDescriptions: Record<ItemType, string> = {
    BOUNTY: "Report someone to the Bishops and collect a bounty for it by using the `/econ bounty` command.",
    JUMPSUIT: "Protect yourself from bounties. Automatically used when a bounty is enacted on you."
};

type PercentlessPrize = { type: PrizeType } & (
    | { type: PrizeType.Credits; amount: number }
    | { type: PrizeType.Role; id: Snowflake }
    | { type: PrizeType.Badge; name: string }
    | { type: PrizeType.Item; item: ItemType }
);

type Prize = PercentlessPrize & { percent: number };

class District<T extends typeof districtOrder[number]> {
    difficulty: string;
    emoji: Snowflake = "860026157982547988";
    credits = 0;

    private prizes: Array<Prize> = [];

    static catchPercent(idx: number) {
        return [20, 35, 40, 50, 70, 75, 80, 85, 90][idx] / 100;
    }

    static convPercent(percent: number): string {
        return `${parseFloat((100 * percent).toFixed(2))}%`;
    }

    constructor(public bishop: T) {}
    setDifficulty(diff: string): this {
        this.difficulty = diff;
        return this;
    }
    setEmoji(id: Snowflake): this {
        this.emoji = id;
        return this;
    }
    getCreditsPrize(): Prize & { type: PrizeType.Credits } {
        const percentsSum = R.sum(this.prizes.map((p) => p.percent));
        return { type: PrizeType.Credits, amount: this.credits, percent: 1 - percentsSum };
    }
    getPrizes<U extends PrizeType>(type?: U): Readonly<(Prize & { type: U })[]> {
        return this.prizes.filter((p) => p.type === type) as (Prize & { type: U })[];
    }
    getAllPrizes(): Readonly<Prize[]> {
        return this.prizes;
    }
    pickPrize(): Prize {
        let randomValue = Math.random();
        for (const prize of this.prizes) {
            randomValue -= prize.percent;
            if (randomValue <= 0) return prize;
        }
        // If one of the prizes wasn't "won", give out the credits
        return this.getCreditsPrize();
    }
    setCredits(amount: number): this {
        this.credits = amount;
        return this;
    }
    addItem(item: ItemType, chance: `${number}%`): this {
        return this._addPrize({ type: PrizeType.Item, item }, chance);
    }
    addRole(id: Snowflake, chance: `${number}%`): this {
        return this._addPrize({ type: PrizeType.Role, id }, chance);
    }
    addRoles(roles: [Snowflake, `${number}%`][]): this {
        for (const [id, percent] of roles) this.addRole(id, percent);
        return this;
    }
    _addPrize(percentlessPrize: PercentlessPrize, chance: `${number}%`): this {
        const percent = +chance.substring(0, chance.length - 1) / 100;
        const prize = { ...percentlessPrize, percent } as Prize;
        this.prizes.push(prize);
        return this;
    }
}

// prettier-ignore
const districts: Array<District<typeof districtOrder[number]>> = [
    new District("Andre")
        .setDifficulty("Easiest")
        .setCredits(500),

    new District("Lisden")
        .setDifficulty("Very Easy")
        .setEmoji("860015991491919882")
        .setCredits(750),

    new District("Keons")
        .setDifficulty("Easy")
        .setEmoji("860015991521804298")
        .setCredits(1000)
        .addItem("BOUNTY", "7.5%"),

    new District("Reisdro")
        .setDifficulty("Medium")
        .setCredits(1250)
        .addItem("BOUNTY", "10%"),

    new District("Sacarver")
        .setDifficulty("Hard")
        .setEmoji("860015991031463947")
        .setCredits(2500)
        .addItem("BOUNTY", "10%")
        .addItem("JUMPSUIT", "5%")
        .addRole(roles.colors.tier1["Bandito Green"], "3%"),

    new District("Listo")
        .setDifficulty("Very Hard")
        .setCredits(3000)
        .addItem("BOUNTY", "10%")
        .addItem("JUMPSUIT", "5%")
        .addRole(roles.colors.tier2["Jumpsuit Green"], "1%"),

    new District("Vetomo")
        .setDifficulty("Extremely Hard")
        .setCredits(4000)
        .addItem("BOUNTY", "10%")
        .addItem("JUMPSUIT", "5%")
        .addRole(roles.colors.tier3["Torch Orange"], "0.75%"),

    new District("Nills")
        .setDifficulty("Almost Impossible")
        .setCredits(5000)
        .addItem("BOUNTY", "10%")
        .addItem("JUMPSUIT", "5%")
        .addRole(roles.colors.tier4["Clancy Black"], "0.5%"),

    new District("Nico")
        .setDifficulty("No Chances")
        .setEmoji("860015969253326858")
        .setCredits(10000)
        .addItem("BOUNTY", "20%")
        .addItem("JUMPSUIT", "10%")
        .addRole(roles.dema, "5%")
        .addRole(roles.colors.DExclusive["Bandito Yellow"], "0.25%")
];

const answerListener = new CommandComponentListener("banditosBishops", []);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner<{ viewlist: boolean }> = async (ctx) => {
    await ctx.defer();

    if (ctx.opts.viewlist) return sendList(ctx);

    const buffer = await fs.promises.readFile("src/assets/images/banditos.gif");

    // prettier-ignore
    const fields = [
        {name: "**`[SYSTEM]`**", value: `Uplink established successfully at ${format(new Date(), "k:mm 'on' d MMMM yyyy")}. **${5} tokens available.**`},
        {name: "**`[SYSTEM]`**", value: `\`B@ND1?0S\` connected from \`153.98.64.214\`. Connection unstable.`},
        {name: "**`[B@ND1?0S]`**", value: "We have &eft suppl&es%<round DEMA. Yo> must evade them;.. You cannot get?caught."}
    ]

    const embed = new MessageEmbed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .addFields(fields)
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
        .setPlaceholder("Select a district")
        .setCustomID(answerListener.generateCustomID({}));

    const actionRow = new MessageActionRow().addComponents(menu).toJSON() as ComponentActionRow;

    await ctx.send({ embeds: [embed.toJSON()], file: [{ name: "file.gif", file: buffer }], components: [actionRow] });
};

answerListener.handler = async (interaction) => {
    if (!interaction.isSelectMenu()) return;
    interaction.deferred = true;

    const [_districtNum] = interaction.values || [];
    if (!_districtNum) return;

    const districtNum = +_districtNum;
    const district = districts[districtNum];
    const bishop = district.bishop;

    const emojis = await interaction.guild?.emojis.fetch();
    const emoji = emojis?.find((e) => e.id === district.emoji);
    if (!emoji) return;

    const embed: MessageEmbed = new MessageEmbed();

    const CHANCE_CAUGHT = District.catchPercent(districtNum);

    if (Math.random() < CHANCE_CAUGHT) {
        await (<Message>interaction.message).removeAttachments();

        embed
            .setColor("#EA523B")
            .setTitle(`VIOLATION DETECTED BY ${bishop.toUpperCase()}`)
            .setAuthor(bishop, emoji.url)
            .setDescription(
                `You have been found in violation of the laws set forth by The Sacred Municipality of Dema. The <#${channelIDs.demacouncil}> has published a violation notice.`
            )
            .setFooter("You win nothing.");
    } else {
        const { percent, ...prize } = district.pickPrize();
        embed
            .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
            .setColor("#FCE300")
            .setThumbnail("attachment://file.gif")
            .setTitle("You won a prize!")
            .setDescription(`Prize won:\nChance of winning: ${percent * 100}%\n${JSON.stringify(prize)}`);
    }

    await interaction.editReply({
        embeds: [embed],
        components: []
    });
};

async function sendList(ctx: ExtendedContext): Promise<void> {
    const embed = new MessageEmbed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor("#FCE300")
        .setThumbnail("attachment://file.gif")
        .setFooter(
            "Notice: This command and all related media is run solely by the Discord Clique and has no affiliation with or sponsorship from the band. DEMAtronix™ is a trademark of The Sacred Municipality of Dema."
        );

    const emojis = await ctx.member.guild.emojis.fetch();
    const buffer = await fs.promises.readFile("src/assets/images/banditos.gif");

    for (let i = 0; i < districts.length; i++) {
        const district = districts[i];
        const bishop = district.bishop;

        const emoji = emojis.find((e) => district.emoji === e.id);

        const creditsPrize = district.getCreditsPrize();
        // Prize types
        const prizes = [creditsPrize, ...district.getAllPrizes()].sort((a, b) => b.percent - a.percent);

        const prizeStrings: string[] = [];
        for (const prize of prizes) {
            const chance = District.convPercent(prize.percent);
            if (prize.type === PrizeType.Credits) prizeStrings.push(`\`${chance}\` crate of ${prize.amount} credits`);
            else if (prize.type === PrizeType.Role) prizeStrings.push(`\`${chance}\` <@&${prize.id}> role`);
            else if (prize.type === PrizeType.Item) prizeStrings.push(`\`${chance}\` for a \`${prize.item}\``);
        }

        const prizeStr = prizeStrings.map((p) => `➼ ${p}`).join("\n");

        const expectedValue = (1 - District.catchPercent(i)) * creditsPrize.percent * creditsPrize.amount;

        const catchRate = District.convPercent(District.catchPercent(i));

        embed.addField(`${emoji} ${bishop}`, `**Catch Rate:** \`${catchRate}\` \n\n${prizeStr}\n\u200b`);
    }

    for (const [item, description] of Object.entries(ItemDescriptions)) {
        embed.addField(`What is a ${item.toLowerCase()}?`, description, true);
    }

    await ctx.send({ embeds: [embed.toJSON()], file: { name: "file.gif", file: buffer } });
}
