import { addMilliseconds, differenceInMilliseconds, endOfDay, startOfDay } from "date-fns";
import { GuildMember, Snowflake } from "discord.js";
import { guild } from "../../../app";
import { roles } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";

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
