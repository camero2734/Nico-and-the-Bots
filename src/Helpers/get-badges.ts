import { Image, loadImage } from "canvas";
import { GuildMember } from "discord.js";

function wrap(text: string, noPNG = false) {
    return `./src/Assets/badges/${text}${noPNG ? "" : ".png"}`;
}

export const badgeLoader = async (member: GuildMember, numGolds: number, placeNum: number): Promise<Image[]> => {
    const badges: Image[] = [];
    const ignore: string[] = [];

    await createBadge("booster.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("585527743324880897"));
        });
    });

    await createBadge("staff.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("330877657132564480"));
        });
    });

    await createBadge("rich.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("350036748404785153"));
        });
    });

    await createBadge("firebreather.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("283272728084086784"));
        });
    });

    await createBadge("cliqueart.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("705224524098043914"));
        });
    });

    await createBadge("youtube.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("341027502703116289"));
        });
    });

    await createBadge("commonfren.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("332021614256455690"));
        });
    });

    await createBadge("artist.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("341029793954922496"));
        });
    });

    await createBadge("top10.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 10) {
                resolve(true);
                ignore.push(wrap("top100"), wrap("top50"), wrap("top25"));
            } else resolve(false);
        });
    });

    await createBadge("level100.png", async function () {
        return new Promise((resolve) => {
            if (member.roles.cache.has("449654945076215828")) {
                ignore.push(wrap("level50"), wrap("level25"));
                resolve(true);
            } else resolve(false);
        });
    });

    await createBadge("top25.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 25) {
                resolve(true);
                ignore.push(wrap("top100"), wrap("top50"));
            } else resolve(false);
        });
    });

    await createBadge("top50.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 50) {
                resolve(true);
                ignore.push(wrap("top100"));
            } else resolve(false);
        });
    });

    // await createBadge("ScavJumpsuit.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "ScavJumpsuit" });
    //     return hasRole;
    // });

    // await createBadge("ScavToplogo.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "ScavToplogo" });
    //     return hasRole;
    // });

    // await createBadge("ScavVulture.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "ScavVulture" });
    //     return hasRole;
    // });

    // await createBadge("ScavHunt2019.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "ScavHunt2019" });
    //     return hasRole;
    // });

    // await createBadge("AndreBlackWhite.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "ANDRE" });
    //     return hasRole;
    // });

    // await createBadge("escapedDEMA.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "ESCAPED_DEMA" });
    //     return hasRole;
    // });

    // await createBadge("lgbt.png", async function () {
    //     const hasRole = await connection
    //         ?.getRepository(Item)
    //         .findOne({ identifier: member.id, type: "Badge", title: "PHTG" });
    //     return hasRole;
    // });

    await createBadge("teamwinner.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("503645677574684683"));
        });
    });

    await createBadge("level50.png", async function () {
        return new Promise((resolve) => {
            if (member.roles.cache.has("449654893108527114")) {
                ignore.push(wrap("level25"));
                resolve(true);
            } else resolve(false);
        });
    });

    await createBadge("top100.png", async function () {
        return new Promise((resolve) => {
            if (placeNum <= 50) resolve(true);
            else resolve(false);
        });
    });

    await createBadge("level25.png", async function () {
        return new Promise((resolve) => {
            if (member.roles.cache.has("449654670357692416")) resolve(true);
            else resolve(false);
        });
    });

    await createBadge("gold100.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 100) {
                ignore.push(...[50, 25, 10, 5].map((n) => wrap(`gold${n}`)));
                resolve(true);
            } else resolve(false);
        });
    });

    await createBadge("gold50.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 50) {
                ignore.push(...[25, 10, 5].map((n) => wrap(`gold${n}`)));
                resolve(true);
            } else resolve(false);
        });
    });

    await createBadge("gold25.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 25) {
                ignore.push(...[10, 5].map((n) => wrap(`gold${n}`)));
                resolve(true);
            } else resolve(false);
        });
    });
    await createBadge("gold10.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 10) {
                ignore.push(wrap("gold5"));
                resolve(true);
            } else resolve(false);
        });
    });

    await createBadge("gold5.png", async function () {
        return new Promise((resolve) => {
            if (numGolds >= 5) {
                resolve(true);
            } else resolve(false);
        });
    });

    await createBadge("dema.png", async function () {
        return new Promise((resolve) => {
            resolve(member.roles.cache.has("451217741584793601"));
        });
    });

    await createBadge("banditos.png", async function () {
        return new Promise((resolve) => {
            resolve(true);
        });
    });

    return badges;

    async function createBadge(file: string, hasBadge: () => Promise<unknown>) {
        file = wrap(file, true);
        const result = await hasBadge();
        if (result && ignore.indexOf(file) === -1) {
            const img = await loadImage(file);
            badges.push(img);
            return true;
        } else return false;
    }
};
