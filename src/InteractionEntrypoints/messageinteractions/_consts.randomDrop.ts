import { addMilliseconds, differenceInMilliseconds, endOfDay, startOfDay } from "date-fns";
import { MessageActionRow, MessageButton, MessageEmbed, Snowflake, TextChannel } from "discord.js";
import { guild, NicoClient } from "../../../app";
import { MessageTools } from "../../Helpers";
import F from "../../Helpers/funcs";
import { MessageInteraction } from "../../Structures/EntrypointMessageInteraction";

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
