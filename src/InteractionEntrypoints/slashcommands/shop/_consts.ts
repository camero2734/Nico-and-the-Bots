import { User } from "@prisma/client";
import { GuildMember, GuildMemberRoleManager, RoleManager, Snowflake } from "discord.js";
import { Role } from "discord.js";
import { roles } from "../../../configuration/config";

export class ColorCategory {
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

export const CONTRABAND_WORDS = ["jumpsuit", "bandito", "rebel", "torch", "clancy", "dmaorg"];

const colorRoles = roles.colors;

export function getColorRoleCategories(roleManager: RoleManager) {
    const tierToRoles = (roleIds: { [k: string]: Snowflake }): Role[] =>
        Object.values(roleIds).map((r) => roleManager.cache.get(r) as Role);

    const tier1 = new ColorCategory(tierToRoles(colorRoles.tier1), { credits: 7500, level: 10 });
    const tier2 = new ColorCategory(tierToRoles(colorRoles.tier2), { credits: 15000, level: 20 });
    const tier3 = new ColorCategory(tierToRoles(colorRoles.tier3), { credits: 25000, level: 50 });
    const tier4 = new ColorCategory(tierToRoles(colorRoles.tier4), { credits: 50000, level: 100 });
    const DExclusive = new ColorCategory(tierToRoles(colorRoles.DExclusive), { credits: 50000, level: 100, DE: true }); // prettier-ignore

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
        "DEMA's Dreamers": {
            id: "DEMA",
            data: tier4,
            description:
                "VIOLATION WARNING: This page contains highly controlled contraband items. The Sacred Municipality of Dema will take any action necessary to keep its citizens safe from this dangerous material."
        },
        "Here Be Dragons": {
            id: "Dragons",
            data: DExclusive,
            description:
                "Trash the Dragon sponsored this collection himself. Browse this exclusive merchandise as a Firebreather."
        }
    };
}
