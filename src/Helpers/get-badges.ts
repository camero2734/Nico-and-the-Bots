import { Image, loadImage } from "canvas";
import { GuildMember } from "discord.js/packages/discord.js";
import { prisma } from "./prisma-init";

interface BadgeLoaderOptions {
    numBadges?: number;
    numGolds?: number;
    placeNum?: number;
}

export const badgeLoader = async (member: GuildMember, options: BadgeLoaderOptions = {}): Promise<Image[]> => {
    let numBadges = options.numBadges || Infinity;
    const numGolds = options.numGolds || 0;
    const placeNum = options.placeNum || Infinity;

    const badgeGenerator = getBadge(member, numGolds, placeNum);

    const badges: Image[] = [];
    while (numBadges > 0) {
        const badge = await badgeGenerator.next();
        if (badge.value) {
            badges.push(badge.value);
            numBadges--;
        }
        if (badge.done) break;
    }

    return badges;
};

async function* getBadge(member: GuildMember, numGolds: number, placeNum: number) {
    const ignore: string[] = [];

    yield await createBadge("booster.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("585527743324880897"));
        });
    });

    yield await createBadge("staff.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("330877657132564480"));
        });
    });

    yield await createBadge("rich.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("350036748404785153"));
        });
    });

    yield await createBadge("firebreather.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("283272728084086784"));
        });
    });

    yield await createBadge("cliqueart.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("705224524098043914"));
        });
    });

    yield await createBadge("youtube.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("341027502703116289"));
        });
    });

    yield await createBadge("commonfren.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("332021614256455690"));
        });
    });

    yield await createBadge("artist.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("341029793954922496"));
        });
    });

    yield await createBadge("top10.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 10) {
                resolve(true);
                ignore.push("top100.png", "top50.png", "top25.png");
            } else resolve(false);
        });
    });

    yield await createBadge("level100.png", async function () {
        return new Promise((resolve) => {
            if (member.roles.cache.has("449654945076215828")) {
                ignore.push("level50.png", "level25.png");
                resolve(true);
            } else resolve(false);
        });
    });

    yield await createBadge("top25.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 25) {
                resolve(true);
                ignore.push("top100.png", "top50.png");
            } else resolve(false);
        });
    });

    yield await createBadge("top50.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 50) {
                resolve(true);
                ignore.push("top100.png");
            } else resolve(false);
        });
    });

    yield await createBadge("ScavJumpsuit.png", async function () {
        const badge = await prisma.badge.findUnique({
            where: { userId_type: { userId: member.id, type: "ScavJumpsuit" } }
        });
        return !!badge;
    });

    yield await createBadge("ScavToplogo.png", async function () {
        const badge = await prisma.badge.findUnique({
            where: { userId_type: { userId: member.id, type: "ScavToplogo" } }
        });
        return !!badge;
    });

    yield await createBadge("ScavVulture.png", async function () {
        const badge = await prisma.badge.findUnique({
            where: { userId_type: { userId: member.id, type: "ScavVulture" } }
        });
        return !!badge;
    });

    yield await createBadge("ScavHunt2019.png", async function () {
        const badge = await prisma.badge.findUnique({
            where: { userId_type: { userId: member.id, type: "ScavHunt2019" } }
        });
        return !!badge;
    });

    yield await createBadge("AndreBlackWhite.png", async function () {
        const badge = await prisma.badge.findUnique({ where: { userId_type: { userId: member.id, type: "ANDRE" } } });
        return !!badge;
    });

    yield await createBadge("escapedDEMA.png", async function () {
        const badge = await prisma.badge.findUnique({
            where: { userId_type: { userId: member.id, type: "ESCAPED_DEMA" } }
        });
        return !!badge;
    });

    yield await createBadge("lgbt.png", async function () {
        const badge = await prisma.badge.findUnique({ where: { userId_type: { userId: member.id, type: "LGBT" } } });
        return !!badge;
    });

    yield await createBadge("teamWinner.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("503645677574684683"));
        });
    });

    yield await createBadge("level50.png", async function () {
        return new Promise((resolve) => {
            if (member.roles.cache.has("449654893108527114")) {
                ignore.push("level25.png");
                resolve(true);
            } else resolve(false);
        });
    });

    yield await createBadge("top100.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 50) resolve(true);
            else resolve(false);
        });
    });

    yield await createBadge("level25.png", async function () {
        return new Promise((resolve) => {
            if (member.roles.cache.has("449654670357692416")) resolve(true);
            else resolve(false);
        });
    });

    yield await createBadge("gold100.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 100) {
                ignore.push(...[50, 25, 10, 5].map((n) => `gold${n}.png`));
                resolve(true);
            } else resolve(false);
        });
    });

    yield await createBadge("gold50.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 50) {
                ignore.push(...[25, 10, 5].map((n) => `gold${n}.png`));
                resolve(true);
            } else resolve(false);
        });
    });

    yield await createBadge("gold25.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 25) {
                ignore.push(...[10, 5].map((n) => `gold${n}.png`));
                resolve(true);
            } else resolve(false);
        });
    });
    yield await createBadge("gold10.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 10) {
                ignore.push("gold5.png");
                resolve(true);
            } else resolve(false);
        });
    });

    yield await createBadge("gold5.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 5) {
                resolve(true);
            } else resolve(false);
        });
    });

    yield await createBadge("dema.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("451217741584793601"));
        });
    });

    yield await createBadge("banditos.png", async function () {
        return new Promise((resolve) => {
            resolve(true);
        });
    });

    async function createBadge(fileName: string, hasBadge: () => Promise<unknown>): Promise<Image | undefined> {
        const fileWithPath = `./src/Assets/badges/${fileName}`;

        const result = await hasBadge();
        if (result && ignore.indexOf(fileName) === -1) {
            const img = await loadImage(fileWithPath);
            return img;
        } else return undefined;
    }
}
