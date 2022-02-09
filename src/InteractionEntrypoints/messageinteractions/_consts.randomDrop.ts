import { RandomDrop } from ".prisma/client";
import async from "async";
import { addMilliseconds, differenceInMilliseconds, endOfDay, startOfDay } from "date-fns";
import {
    Emoji,
    Guild,
    GuildMember,
    ActionRowComponent,
    ButtonComponent,
    Snowflake
} from "discord.js/packages/discord.js";
import { guild } from "../../../app";
import { dropEmojiGuildId, roles } from "../../Configuration/config";
import { MessageTools } from "../../Helpers";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { GenBtnId } from "./randomDrop";

export type RolePrize = { name: "role"; id: Snowflake };
export type CreditsPrize = { name: "credits"; amount: number };
export type DropPrize = { quantity: number } & (RolePrize | CreditsPrize);

export function getDropName(prize: DropPrize): string {
    switch (prize.name) {
        case "credits":
            return `${prize.quantity} bundle${F.plural(prize.quantity)} of ${prize.amount} credits`;
        case "role": {
            const roleName = guild.roles.cache.get(prize.id)?.name;
            if (!roleName) return "a role";
            return `${prize.quantity} ${roleName} role${F.plural(prize.quantity)}`;
        }
    }
}

export function getPrizeName(prize: DropPrize): string {
    switch (prize.name) {
        case "credits":
            return `${prize.amount} credits`;
        case "role":
            return `the <@&${prize.id}> role`;
    }
}

export function calculateNextPrize(lastRun?: Date): { runAt: Date; prize: DropPrize } {
    const now = new Date();
    const lastRunAt = lastRun ?? startOfDay(now);
    const timeRemainingInDay = differenceInMilliseconds(endOfDay(now), lastRunAt);

    const runInMs = Math.floor((Math.random() * timeRemainingInDay) / 2);
    const runAt = addMilliseconds(now, runInMs);

    const prize: DropPrize = { name: "credits", amount: Math.floor(Math.random() * 6 + 2) * 1000, quantity: 1 };

    return { runAt, prize };
}

export async function givePrize(prize: DropPrize, member: GuildMember): Promise<void> {
    switch (prize.name) {
        case "credits": {
            await prisma.user.update({ where: { id: member.id }, data: { credits: { increment: prize.amount } } });
            return;
        }
        case "role": {
            const isColorRole = JSON.stringify(roles.colors).includes(prize.id); // lol
            if (isColorRole) {
                await prisma.colorRole.upsert({
                    where: { roleId_userId: { roleId: prize.id, userId: member.id } },
                    create: { roleId: prize.id, userId: member.id, amountPaid: 0 },
                    update: {}
                });
            } else {
                await member.roles.add(prize.id);
            }

            return;
        }
    }
}

async function getEmoji(member: GuildMember, guild: Guild): Promise<Emoji | undefined> {
    try {
        const EMOJI_NAME = `drop${member.id}`;

        const emojis = await guild.emojis.fetch();
        const emoji = emojis.find((e) => e.name === EMOJI_NAME);
        if (emoji) return emoji;

        return await guild.emojis.create(member.displayAvatarURL(), EMOJI_NAME);
    } catch (e) {
        return undefined;
    }
}

const NUM_BUTTONS = 16;
export type Guess = { member: GuildMember; idx: number };
export async function generateActionRows(guesses: Guess[], drop: RandomDrop): Promise<ActionRowComponent[]> {
    const emojiGuild = guesses.length > 0 ? await guesses[0].member.client.guilds.fetch(dropEmojiGuildId) : undefined;

    const buttons: ButtonComponent[] = await async.mapLimit(F.indexArray(NUM_BUTTONS), 3, async (idx) => {
        const button = new ButtonComponent({
            style: "PRIMARY",
            customId: GenBtnId({
                dropId: drop.id,
                idx: `${idx}`
            }),
            emoji: "❔"
        });

        const guess = guesses.find((guess) => guess.idx === idx);

        if (guess) {
            button.setDisabled(true);
            if (drop.winningIndices.includes(idx)) {
                button.setStyle(ButtonStyle.Success);
            } else {
                button.setStyle("DANGER");
            }

            if (emojiGuild) {
                const emoji = await getEmoji(guess.member, emojiGuild);
                if (emoji) button.setEmoji(emoji.identifier);
            }
        }

        return button;
    });

    return MessageTools.allocateButtonsIntoRows(buttons, { maxButtonsPerRow: 4 });
}
