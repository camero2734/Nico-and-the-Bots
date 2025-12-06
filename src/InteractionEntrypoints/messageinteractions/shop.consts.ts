import type { GuildMember, Role, RoleManager, Snowflake } from "discord.js";
import type { User } from "../../../generated/prisma/client";
import { roles } from "../../Configuration/config";

export class ShopCategory {
  public requiresDE = false;
  public credits: number;
  public level: number;
  public roles: Role[];
  public locked = false;
  constructor(roles: Role[], opts: Partial<{ level: number; credits: number; DE: boolean; locked: boolean }>) {
    this.level = opts.level || 0;
    this.credits = opts.credits || 0;
    this.requiresDE = opts.DE || false;
    this.locked = opts.locked || false;
    this.roles = roles;
  }

  unlockedFor(member: GuildMember, dbUser: User) {
    if (this.locked) return false;
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

export const CONTRABAND_WORDS = [
  "jumpsuit",
  "bandito",
  "rebel",
  "torch",
  "clancy",
  "dmaorg",
  "paladin",
  "breach",
  "city walls",
];

export function getColorRoleCategories(roleManager: RoleManager) {
  const colorRoles = roles.colors;
  const tierToRoles = (roleIds: { [k: string]: Snowflake }): Role[] =>
    Object.values(roleIds).map((r) => roleManager.cache.get(r) as Role);

  const scaledback = new ShopCategory(tierToRoles(colorRoles.scaledback), {
    credits: 7500,
    level: 10,
  });
  const mypride = new ShopCategory(tierToRoles(colorRoles.mypride), {
    credits: 15000,
    level: 20,
  });
  const morningsun = new ShopCategory(tierToRoles(colorRoles.morningsun), {
    credits: 20_000,
    level: 30,
  });
  const peace = new ShopCategory(tierToRoles(colorRoles.peace), {
    credits: 25_000,
    level: 50,
  });
  const sofew = new ShopCategory(tierToRoles(colorRoles.sofew), {
    credits: 40_000,
    level: 75,
  });
  const digitalremains = new ShopCategory(tierToRoles(colorRoles.digitalremains), {
    credits: 50_000,
    level: 100,
    DE: true,
  });
  const holographics = new ShopCategory(tierToRoles(colorRoles.holographics), {
    credits: 150_000,
    level: 100,
    DE: true,
  });

  return {
    "The Scaled Back Collection": {
      id: "ScaledBack",
      data: scaledback,
      description: "Looking for basic colors? The Scaled Back Collection has you covered.",
    },
    "Lean on My Pride": {
      id: "Violet",
      data: mypride,
      description: "Ready to branch out into more vibrant colors? The Lean on My Pride collection is for you!",
    },
    "Towards the Morning Sun": {
      id: "Saturation",
      data: morningsun,
      description: "Don't be afraid! Brighten your day with these warm, relaxing colors.",
    },
    "Pieces of Peace": {
      id: "Keons",
      data: peace,
      description:
        "Get your peace of mind back with these colors handpicked by Keons himself, before... well, you know.",
    },
    "So Few, So Proud, So Emotional": {
      id: "DEMA",
      data: sofew,
      description: "So Few, So Proud, So Emotional. Hello, colors!",
    },
    "Digital Remains": {
      id: "Dragons",
      data: digitalremains,
      description:
        "**VIOLATION WARNING**: This page contains highly controlled contraband items. The Sacred Municipality of Dema will take any action necessary to keep its citizens safe from this dangerous material.",
    },
    "The Holographics": {
      id: "Holographics",
      data: holographics,
      description: "Please do not use the holographics. But if you do...",
    },
  };
}

export function getSongRoleCategories(roleManager: RoleManager) {
  const songRoles = roles.songs;
  const tierToRoles = (roleIds: { [k: string]: Snowflake }): Role[] =>
    Object.values(roleIds).map((r) => roleManager.cache.get(r) as Role);

  const selfTitled = new ShopCategory(tierToRoles(songRoles.selfTitled), {
    credits: 12_500,
    level: 15,
  });
  const regionalAtBest = new ShopCategory(tierToRoles(songRoles.regionalAtBest), { credits: 12_500, level: 15 });
  const vessel = new ShopCategory(tierToRoles(songRoles.vessel), {
    credits: 12_500,
    level: 15,
  });
  const blurryface = new ShopCategory(tierToRoles(songRoles.blurryface), {
    credits: 12_500,
    level: 15,
  });
  const trench = new ShopCategory(tierToRoles(songRoles.trench), {
    credits: 12_500,
    level: 15,
  });
  const scaledAndIcy = new ShopCategory(tierToRoles(songRoles.scaledAndIcy), {
    credits: 12_500,
    level: 15,
  });
  const clancy = new ShopCategory(tierToRoles(songRoles.clancy), {
    credits: 12_500,
    level: 15,
  });

  return {
    "Twenty One Pilots": {
      id: "SelfTitled",
      data: selfTitled,
      description: "The album that started it all.",
    },
    "Regional at Best": {
      id: "RegionalAtBest",
      data: regionalAtBest,
      description: "The album that was taken off the shelves.",
    },
    Vessel: {
      id: "Vessel",
      data: vessel,
      description: "The album that put them on the map.",
    },
    Blurryface: {
      id: "Blurryface",
      data: blurryface,
      description: "The album that made them famous.",
    },
    Trench: {
      id: "Trench",
      data: trench,
      description: "The album that created a world.",
    },
    "Scaled and Icy": {
      id: "ScaledAndIcy",
      data: scaledAndIcy,
      description: "The album that defied expectations.",
    },
    Clancy: {
      id: "Clancy",
      data: clancy,
      description: "The album that's the end of an era.",
    },
  };
}
