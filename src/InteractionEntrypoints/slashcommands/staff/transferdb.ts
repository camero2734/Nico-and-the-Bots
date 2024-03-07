// import { BadgeType, PerkType, WarningType } from ".prisma/client";
// import { Snowflake } from "discord.js";
// import R from "ramda";
// import { Database, open } from "sqlite";
// import sqlite3 from "sqlite3";
// import { channelIDs, userIDs } from "../../../Configuration/config";
// import { CommandError } from "../../../Configuration/definitions";
// import F from "../../../Helpers/funcs";
// import { prisma } from "../../../Helpers/prisma-init";
// import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

// const command = new SlashCommand({
//     description: "Migrates DB",
//     options: []
// });

// interface TransferParams {
//     db: Database<sqlite3.Database, sqlite3.Statement>;
//     ctx: typeof SlashCommand.GenericContextType;
//     existingUsers: Set<Snowflake>;
// }

// command.setHandler(async (ctx) => {
//     if (ctx.member.id !== userIDs.me) throw new CommandError("No");

//     throw new CommandError("Not necessary at the time");

//     await ctx.deferReply();

//     const db = await open({
//         filename: "discord.sqlite",
//         driver: sqlite3.Database
//     });

//     await transferEconomies({ db, ctx, existingUsers: new Set() });
//     await F.wait(500);

//     const existingUsers = new Set<Snowflake>();
//     const users = await prisma.user.findMany({ select: { id: true } });
//     for (const user of users) existingUsers.add(user.id);

//     await transferColorRoles({ db, ctx, existingUsers });
//     await F.wait(750);

//     await transferSongRoles({ db, ctx, existingUsers });
//     await F.wait(750);

//     await transferFMs({ db, ctx, existingUsers });
//     await F.wait(750);

//     await transferGolds({ db, ctx, existingUsers });
//     await F.wait(750);

//     await transferPerks({ db, ctx, existingUsers });
//     await F.wait(750);

//     await transferWarnings({ db, ctx, existingUsers });
//     await F.wait(750);

//     await transferBadges({ db, ctx, existingUsers });
//     await F.wait(750);

//     await ctx.editReply(`Finished transferring database.`);
// });

// async function transferEconomies({ db, ctx }: TransferParams) {
//     const userEconomies = await db.all("SELECT * FROM economy");

//     await ctx.editReply(`Deleting current database...`);

//     const BATCH_SIZE = 1_000;
//     const batches = R.splitEvery(BATCH_SIZE, userEconomies);

//     let count = 0;
//     for (let i = 1; i < 10; i++) {
//         const res = await prisma.user.deleteMany({ where: { id: { startsWith: `${i}` } } });
//         count += res.count;
//         await ctx.editReply(`Deleted ${count} records (${i})...`);
//     }

//     await ctx.editReply(`Transferring ${userEconomies.length} economies...`);

//     for (let i = 0; i < batches.length; i++) {
//         console.log(`here ${i}`);
//         const batch = batches[i];

//         await prisma.user.createMany({
//             data: batch.map((econ) => ({
//                 id: econ.id,
//                 credits: Math.min(Math.max(econ.credits, 0), 1e12),
//                 score: econ.alltimeScore
//             })),
//             skipDuplicates: true
//         });

//         await prisma.dailyBox.createMany({
//             data: batch.map((econ) => ({
//                 userId: econ.id,
//                 tokens: Math.min(Math.max(econ.blurrytokens, 0), 5),
//                 steals: Math.ceil(econ.steals / 2),
//                 blocks: Math.ceil(econ.blocks),
//                 dailyCount: econ.dailyCount
//             })),
//             skipDuplicates: true
//         });

//         await ctx.editReply(`Transferred ${BATCH_SIZE * (i + 1)} economies.`);
//     }

//     await ctx.editReply(`Transferred ${userEconomies.length} economies. Finished.`);
// }

// async function transferColorRoles({ db, ctx }: TransferParams) {
//     const colorRoles = await db.all(`SELECT * FROM item WHERE type="ColorRole"`);
//     await prisma.$executeRaw`DELETE FROM "ColorRole"`;

//     const allRoles = await ctx.guild.roles.fetch();

//     await ctx.editReply(`Starting to transfer ${colorRoles.length} color roles...`);

//     const colorRoleCount = await prisma.colorRole.createMany({
//         data: colorRoles
//             .map(({ id, title }) => ({
//                 roleId: title,
//                 userId: id,
//                 amountPaid: 0
//             }))
//             .filter((cr) => allRoles.has(cr.roleId))
//     });

//     await ctx.editReply(`Transferred ${colorRoleCount.count} color roles.`);
// }

// async function transferSongRoles({ db, ctx }: TransferParams) {
//     const songRoles = await db.all(`SELECT * FROM item WHERE type="SongRole"`);
//     await prisma.$executeRaw`DELETE FROM "SongRole"`;

//     const allRoles = await ctx.guild.roles.fetch();

//     await ctx.editReply(`Starting to transfer ${songRoles.length} song roles...`);

//     const songRoleCount = await prisma.songRole.createMany({
//         data: songRoles
//             .map(({ id, title }) => ({
//                 roleId: title,
//                 userId: id
//             }))
//             .filter((sr) => allRoles.has(sr.roleId))
//     });

//     await ctx.editReply(`Transferred ${songRoleCount.count} song roles.`);
// }

// async function transferFMs({ db, ctx, existingUsers }: TransferParams) {
//     const fms = await db.all(`SELECT * FROM item WHERE type="FM"`);
//     await prisma.$executeRaw`DELETE FROM "UserLastFM"`;

//     await ctx.editReply(`Starting to transfer ${fms.length} FM usernames...`);

//     const fmCount = await prisma.userLastFM.createMany({
//         data: fms
//             .map((fm) => ({
//                 username: fm.title,
//                 userId: fm.id,
//                 createdAt: new Date(fm.time)
//             }))
//             .filter((fm) => existingUsers.has(fm.userId)),
//         skipDuplicates: true
//     });

//     await ctx.editReply(`Transferred ${fmCount.count} FM usernames.`);
// }

// async function transferGolds({ db, ctx, existingUsers }: TransferParams) {
//     const goldCounts = await db.all(`SELECT * FROM counter WHERE title="GoldCount"`);
//     await prisma.$executeRaw`DELETE FROM "Gold"`;

//     await ctx.editReply(`Starting to transfer ${goldCounts.length} user golds...`);

//     const goldsCount = await prisma.gold.createMany({
//         data: goldCounts
//             .map((gc) => {
//                 return F.indexArray(gc.count).map(() => ({
//                     houseOfGoldMessageUrl: "Unavailable",
//                     messageId: "Unavailable",
//                     channelId: "Unavailable",

//                     fromUserId: userIDs.bots.nico,
//                     toUserId: gc.id
//                 }));
//             })
//             .flat()
//             .filter((gold) => existingUsers.has(gold.toUserId)),
//         skipDuplicates: true
//     });

//     await ctx.editReply(`Transferred ${goldsCount.count} user golds.`);
// }

// async function transferPerks({ db, ctx, existingUsers }: TransferParams) {
//     const perks = await db.all(`SELECT * FROM item WHERE type="Perk"`);
//     await prisma.$executeRaw`DELETE FROM "Perk"`;

//     await ctx.editReply(`Starting to transfer ${perks.length} perks...`);

//     const perkType = (oldPerkName: string): PerkType => {
//         switch (oldPerkName) {
//             case "doubledaily":
//                 return "DoubleDailyCredits";
//             case "lvlcred":
//                 return "LevelCredits";
//             case "blurryboxinc":
//                 return "DoubleDailyTokens";
//             default:
//                 throw new Error("Invalid perk type");
//         }
//     };

//     const perkCount = await prisma.perk.createMany({
//         data: perks
//             .map((p) => ({
//                 type: perkType(p.title),
//                 userId: p.id
//             }))
//             .filter((perk) => existingUsers.has(perk.userId)),
//         skipDuplicates: true
//     });

//     await ctx.editReply(`Transferred ${perkCount.count} perks.`);
// }

// async function transferWarnings({ db, ctx, existingUsers }: TransferParams) {
//     const warnings = await db.all(`SELECT * FROM item WHERE type="Warning"`);
//     await prisma.$executeRaw`DELETE FROM "Warning"`;

//     await ctx.editReply(`Starting to transfer ${warnings.length} warnings...`);

//     const warningType = (oldWarnType: string): WarningType => {
//         switch (oldWarnType) {
//             case "Bothering Others":
//                 return "BotheringOthers";
//             case "Drama":
//                 return "Drama";
//             case "Spam":
//                 return "Spam";
//             case "NSFW/Slurs":
//                 return "NsfwOrSlurs";
//             default:
//                 return "Other";
//         }
//     };

//     const warningsCount = await prisma.warning.createMany({
//         data: warnings
//             .map((w) => {
//                 const { rule, severity, content, channel, given } = JSON.parse(w.title);
//                 return {
//                     reason: content,
//                     type: warningType(rule),
//                     severity: isNaN(+severity) ? 5 : +severity,
//                     channelId: channel || channelIDs.staff,
//                     warnedUserId: w.id,
//                     issuedByUserId: given && existingUsers.has(given) ? given : userIDs.bots.nico,
//                     createdAt: new Date(w.time)
//                 };
//             })
//             .filter((perk) => existingUsers.has(perk.warnedUserId)),
//         skipDuplicates: true
//     });

//     await ctx.editReply(`Transferred ${warningsCount.count} warnings.`);
// }

// async function transferBadges({ db, ctx, existingUsers }: TransferParams) {
//     const badges = await db.all(`SELECT * FROM item WHERE type="Badge"`);
//     await prisma.$executeRaw`DELETE FROM "Badge"`;

//     await ctx.editReply(`Starting to transfer ${badges.length} badges...`);

//     const badgeType = (oldBadgeType: string): BadgeType => {
//         if (oldBadgeType.startsWith("PH")) return "LGBT";
//         else if (oldBadgeType in BadgeType) return oldBadgeType as BadgeType;
//         else throw new Error("Invalid badge type");
//     };

//     const badgesCount = await prisma.badge.createMany({
//         data: badges
//             .map((badge) => ({
//                 userId: badge.id,
//                 type: badgeType(badge.title)
//             }))
//             .filter((perk) => existingUsers.has(perk.userId)),
//         skipDuplicates: true
//     });

//     await ctx.editReply(`Transferred ${badgesCount.count} badges.`);
// }

// export default command;
