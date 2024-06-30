import { User } from "@prisma/client";
import { GuildMember, Role, RoleManager, Snowflake } from "discord.js";
import { roles } from "../../Configuration/config";

export class ShopCategory {
    public requiresDE = false;
    public credits: number;
    public level: number;
    public roles: Role[];
    constructor(roles: Role[], opts: Partial<{ level: number; credits: number; DE: boolean }>) {
        this.level = opts.level || 0;
        this.credits = opts.credits || 0;
        this.requiresDE = opts.DE || false;
        this.roles = roles;
    }

    unlockedFor(member: GuildMember, dbUser: User) {
        const meetsDE = this.requiresDE ? member.roles.cache.has(roles.deatheaters) : true;
        return this.level <= dbUser.level && meetsDE;
    }

    purchasable(roleID: string, member: GuildMember, dbUser: User): boolean {
        if (!this.unlockedFor(member, dbUser)) return false; // Checks level and DE
        const role = this.roles.find((r) => r.id === roleID);
        if (!role) return false; // Invalid role ID

        if (dbUser.credits < this.credits) return false; // Check credits

        return true;
    }
}

export const CONTRABAND_WORDS = ["jumpsuit", "bandito", "rebel", "torch", "clancy", "dmaorg", "paladin"];

export function getColorRoleCategories(roleManager: RoleManager) {
    const colorRoles = roles.colors;
    const tierToRoles = (roleIds: { [k: string]: Snowflake }): Role[] =>
        Object.values(roleIds).map((r) => roleManager.cache.get(r) as Role);

    const tier1 = new ShopCategory(tierToRoles(colorRoles.tier1), { credits: 7500, level: 10 });
    const tier2 = new ShopCategory(tierToRoles(colorRoles.tier2), { credits: 15000, level: 20 });
    const tier3 = new ShopCategory(tierToRoles(colorRoles.tier3), { credits: 15000, level: 35 });
    const tier4 = new ShopCategory(tierToRoles(colorRoles.tier4), { credits: 25000, level: 50 });
    const tier5 = new ShopCategory(tierToRoles(colorRoles.tier5), { credits: 50000, level: 100 });
    const DExclusive = new ShopCategory(tierToRoles(colorRoles.DExclusive), { credits: 50000, level: 100, DE: true }); // prettier-ignore

    return {
        "The Scaled Back Collection": {
            id: "ScaledBack",
            data: tier1,
            description: "Looking for basic colors? The Scaled Back Collection has you covered."
        },
        "Violets of Vetomo": {
            id: "Violet",
            data: tier2,
            description: "Ready to branch out into more vibrant colors? Violets of Vetomo is here to help."
        },
        "Saturation Creations": {
            id: "Saturation",
            data: tier3,
            description:
                "Do you want to stand out in the crowd? Saturation Creations provides a variety of bright, colors to increase your saturation. Because saturation is happiness™."
        },
        "Keons' Neons": {
            id: "Keons",
            data: tier4,
            description: "These colors are to die for! Handpicked by Keons himself, before... well, you know."
        },
        "DEMA's Dreamers": {
            id: "DEMA",
            data: tier5,
            description:
                "**VIOLATION WARNING**: This page contains highly controlled contraband items. The Sacred Municipality of Dema will take any action necessary to keep its citizens safe from this dangerous material."
        },
        "Tower Treasures": {
            id: "Dragons",
            data: DExclusive,
            description:
                "Climb the top of the tower and see what you'll find! Browse this exclusive merchandise as a Firebreather."
        }
    };
}

export function getSongRoleCategories(roleManager: RoleManager) {
    const songRoles = roles.songs;
    const tierToRoles = (roleIds: { [k: string]: Snowflake }): Role[] =>
        Object.values(roleIds).map((r) => roleManager.cache.get(r) as Role);

    const selfTitled = new ShopCategory(tierToRoles(songRoles.selfTitled), { credits: 25_000, level: 15 });
    const regionalAtBest = new ShopCategory(tierToRoles(songRoles.regionalAtBest), { credits: 25_000, level: 15 });
    const vessel = new ShopCategory(tierToRoles(songRoles.vessel), { credits: 25_000, level: 15 });
    const blurryface = new ShopCategory(tierToRoles(songRoles.blurryface), { credits: 25_000, level: 15 });
    const trench = new ShopCategory(tierToRoles(songRoles.trench), { credits: 25_000, level: 15 });
    const scaledAndIcy = new ShopCategory(tierToRoles(songRoles.scaledAndIcy), { credits: 25_000, level: 15 });
    const clancy = new ShopCategory(tierToRoles(songRoles.clancy), { credits: 25_000, level: 15 });

    return {
        "Twenty One Pilots": {
            id: "SelfTitled",
            data: selfTitled,
            description: "The album that started it all. Get a role from the album the self-titled album."
        },
        "Regional at Best": {
            id: "RegionalAtBest",
            data: regionalAtBest,
            description: "The album that was taken off the shelves. Get a role from the album Regional at Best."
        },
        "Vessel": {
            id: "Vessel",
            data: vessel,
            description: "The album that put them on the map. Get a role from the album Vessel."
        },
        "Blurryface": {
            id: "Blurryface",
            data: blurryface,
            description: "The album that made them famous. Get a role from the album Blurryface."
        },
        "Trench": {
            id: "Trench",
            data: trench,
            description: "The album that created a world. Get a role from the album Trench."
        },
        "Scaled and Icy": {
            id: "ScaledAndIcy",
            data: scaledAndIcy,
            description: "The album that defied expectations. Get a role from the album Scaled and Icy."
        },
        "Clancy": {
            id: "Clancy",
            data: clancy,
            description: "The album that's the end of an era. Get a role from the album Clancy."
        }
    };
}
