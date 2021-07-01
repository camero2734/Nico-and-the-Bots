import { createCanvas, loadImage } from "canvas";
import { channelIDs, roles, userIDs } from "configuration/config";
import { CommandComponentListener, CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { Item } from "database/entities/Item";
import {
    BufferResolvable,
    Collection,
    EmbedFieldData,
    EmojiIdentifierResolvable,
    GuildMember,
    Message,
    MessageActionRow,
    MessageAttachment,
    MessageEmbed,
    MessageSelectMenu,
    MessageSelectOptionData,
    Snowflake
} from "discord.js";
import { strEmbed } from "helpers";
import fs from "fs";
import F from "helpers/funcs";
import { ComponentActionRow } from "slash-create";
import { format } from "date-fns";

export const Options: CommandOptions = {
    description: "Opens a box",
    options: []
};

const districtOrder = <const>["Nills", "Vetomo", "Listo", "Sacarver", "Reisdro", "Keons", "Lisden", "Andre", "Nico"];
const difficulties = [
    "Easiest",
    "Very Easy",
    "Easy",
    "Medium",
    "Hard",
    "Very Hard",
    "Extremely Hard",
    "Almost Impossible",
    "No Chances"
];

// const prizes: Record<typeof districtOrder[number], any> = {
//     "Nico": {
//         caught: 50
//     }
// }

const getEmoji = (name: typeof districtOrder[number]): EmojiIdentifierResolvable => {
    const bishopEmojis: Record<string, Snowflake> = {
        Nico: "860015969253326858",
        Keons: "860015991521804298",
        Lisden: "860015991491919882",
        Sacarver: "860015991031463947"
    };
    return <EmojiIdentifierResolvable>{ id: bishopEmojis[name] || "860026157982547988" };
};

const answerListener = new CommandComponentListener("banditosBishops", []);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer();

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

    const options: MessageSelectOptionData[] = districtOrder.map((bishop, idx) => ({
        label: `DST. ${bishop.toUpperCase()}`,
        description: `Search ${bishop}'s district. ${difficulties[idx]}.`,
        value: `${idx}`,
        emoji: getEmoji(bishop)
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
    const bishop = districtOrder[districtNum];

    const embed: MessageEmbed = new MessageEmbed().setThumbnail("attachment://file.gif");
    if (Math.random() < 0.3) {
        embed.setTitle(`CAUGHT BY ${bishop.toUpperCase()}`).setDescription("You were caught. Haha.");
    } else {
        embed
            .setTitle("You won a prize!")
            .setDescription(`IDK what yet though. You didn't get captured by ${bishop} though.`);
    }

    await interaction.editReply({
        embeds: [embed],
        components: []
    });
};
