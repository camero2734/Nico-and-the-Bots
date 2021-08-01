import { Snowflake } from "discord.js";
import R from "ramda";
import { roles } from "../../configuration/config";

export const BOUNTY_NUM_CREDITS = 1000;

export const districtOrder = <const>[
    "Andre",
    "Lisden",
    "Keons",
    "Reisdro",
    "Sacarver",
    "Listo",
    "Vetomo",
    "Nills",
    "Nico"
];

export enum PrizeType {
    Credits,
    Role,
    Badge,
    Item
}

type ItemType = "BOUNTY" | "JUMPSUIT";

export const ItemDescriptions: Record<ItemType, string> = {
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

export function getPrizeName(prize: Prize): string {
    if (prize.type === PrizeType.Credits) return `crate of ${prize.amount} credits`;
    else if (prize.type === PrizeType.Role) return `<@&${prize.id}> role`;
    else if (prize.type === PrizeType.Item) return `${prize.item}`;
    else return "prize";
}

export class District<T extends typeof districtOrder[number]> {
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
    _addPrize(percentlessPrize: PercentlessPrize, chance: `${number}%`): this {
        const percent = +chance.substring(0, chance.length - 1) / 100;
        const prize = { ...percentlessPrize, percent } as Prize;
        this.prizes.push(prize);
        return this;
    }
}

// prettier-ignore
export const districts: Array<District<typeof districtOrder[number]>> = [
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
