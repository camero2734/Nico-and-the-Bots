import { User } from "@prisma/client";
import { GuildMember } from "discord.js";
import { Role } from "discord.js";
import { roles } from "../../configuration/config";

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
