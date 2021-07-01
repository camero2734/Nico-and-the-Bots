import { Canvas } from "canvas";
import { roles } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { format } from "date-fns";
import {
    EmojiIdentifierResolvable,
    MessageActionRow,
    MessageEmbed,
    MessageSelectMenu,
    MessageSelectOptionData,
    Snowflake
} from "discord.js";
import fs from "fs";
import { CommandContext, CommandOptionType, ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Opens a box",
    options: [{ name: "viewmap", type: CommandOptionType.BOOLEAN, description: "View the supply map", required: false }]
};

const districtOrder = <const>["Andre", "Lisden", "Keons", "Reisdro", "Sacarver", "Listo", "Vetomo", "Nills", "Nico"];

enum PrizeType {
    Credits,
    Role,
    Badge
}

type Prize = { type: PrizeType; tickets: number } & (
    | { type: PrizeType.Credits; amount: number }
    | { type: PrizeType.Role; id: Snowflake }
    | { type: PrizeType.Badge; name: string }
);

class District<T extends typeof districtOrder[number]> {
    difficulty: string;
    emoji: Snowflake = "860026157982547988";

    private prizes: Array<Prize> = [];
    private ticketCount = 0;

    static catchPercent(idx: number) {
        return idx / 10;
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
    getTicketCount(): number {
        return this.ticketCount;
    }
    getPrizes<U extends PrizeType>(type: U): (Prize & { type: U })[] {
        return this.prizes.filter((p) => p.type === type) as (Prize & { type: U })[];
    }
    pickPrize(): Prize {
        let randomTicket = Math.floor(Math.random() * this.ticketCount);
        for (const prize of this.prizes) {
            randomTicket -= prize.tickets;
            if (randomTicket <= 0) return prize;
        }
        throw new Error("No prize found");
    }
    addCredits(amount: number, tickets: number): this {
        return this._addPrize({ type: PrizeType.Credits, amount, tickets });
    }
    addRole(id: Snowflake, tickets: number): this {
        return this._addPrize({ type: PrizeType.Role, id, tickets });
    }
    addRoles(roles: [Snowflake, number][]): this {
        for (const [id, tickets] of roles) this.addRole(id, tickets);
        return this;
    }
    _addPrize(prize: Prize): this {
        this.prizes.push(prize);
        this.ticketCount += prize.tickets;
        return this;
    }
}

// prettier-ignore
const districts: Array<District<typeof districtOrder[number]>> = [
    new District("Andre")
        .setDifficulty("Easiest")
        .addCredits(500, 30),

    new District("Lisden")
        .setDifficulty("Very Easy")
        .setEmoji("860015991491919882")
        .addCredits(1000, 50),

    new District("Keons")
        .setDifficulty("Easy")
        .setEmoji("860015991521804298")
        .addCredits(1500, 50),

    new District("Reisdro")
        .setDifficulty("Medium")
        .addCredits(2000, 50),

    new District("Sacarver")
        .setDifficulty("Hard")
        .setEmoji("860015991031463947")
        .addCredits(2500, 50),

    new District("Listo")
        .setDifficulty("Very Hard")
        .addCredits(3000, 50),

    new District("Vetomo")
        .setDifficulty("Extremely Hard")
        .addCredits(3500, 50),

    new District("Nills")
        .setDifficulty("Almost Impossible")
        .addCredits(4000, 50),

    new District("Nico")
        .setDifficulty("No Chances")
        .setEmoji("860015969253326858")
        .addCredits(5000, 50)
        .addRole(roles.dema, 45)
];

const answerListener = new CommandComponentListener("banditosBishops", []);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner<{ viewmap: boolean }> = async (ctx) => {
    await ctx.defer();

    if (ctx.opts.viewmap) return sendList(ctx);

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

    const embed: MessageEmbed = new MessageEmbed().setThumbnail("attachment://file.gif");

    const CHANCE_CAUGHT = District.catchPercent(districtNum);

    if (Math.random() < CHANCE_CAUGHT) {
        embed.setTitle(`CAUGHT BY ${bishop.toUpperCase()}`).setDescription("You were caught. Haha.");
    } else {
        const { tickets, ...prize } = district.pickPrize();
        embed.setTitle("You won a prize!").setDescription(`Prize won:\nTickets: ${tickets}\n${JSON.stringify(prize)}`);
    }

    await interaction.editReply({
        embeds: [embed],
        components: []
    });
};

async function sendList(ctx: ExtendedContext): Promise<void> {
    const embed = new MessageEmbed()
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor("#FCE300");

    const emojis = await ctx.member.guild.emojis.fetch();

    for (let i = 0; i < districts.length; i++) {
        const district = districts[i];
        const bishop = district.bishop;

        const emoji = emojis.find((e) => district.emoji === e.id);

        // Prize types
        const credits = district.getPrizes(PrizeType.Credits);
        const roles = district.getPrizes(PrizeType.Role);

        const win = (p: Prize) => ((100 * p.tickets) / district.getTicketCount()).toFixed(1) + "%";

        let creditsMsg = "";
        if (credits.length > 0) {
            creditsMsg = `**Credits:** ${credits[0].amount} (${win(credits[0])})`;
        }

        let rolesMsg = "";
        if (roles.length > 0) {
            rolesMsg = "**Roles:**\n" + roles.map((r) => `<@&${r.id}>  (${win(r)})`).join("\n");
        }

        const catchRate = (100 * District.catchPercent(i)).toFixed(1);
        embed.addField(`${emoji} ${bishop}`, `**Catch Rate:**: ${catchRate}%\n${creditsMsg}\n${rolesMsg}`, true);
    }

    await ctx.send({ embeds: [embed.toJSON()] });
}
