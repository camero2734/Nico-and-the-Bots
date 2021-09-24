import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import R from "ramda";

const command = new SlashCommand(<const>{
    description: "Migrates DB",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.member.id !== userIDs.me) throw new CommandError("No");

    await ctx.deferReply();

    const db = await open({
        filename: "discord.sqlite",
        driver: sqlite3.Database
    });

    // Economy
    const userEconomies = await db.all("SELECT * FROM economy");

    await ctx.editReply(`Starting to transfer ${userEconomies.length} economies...`);

    const BATCH_SIZE = 1_000;
    const batches = R.splitEvery(BATCH_SIZE, userEconomies);

    console.log(`${await prisma.user.count()} records`);

    await prisma.$executeRaw`DELETE FROM "User"`;

    for (let i = 0; i < batches.length; i++) {
        console.log(`here ${i}`);
        const batch = batches[i];

        const userCount = await prisma.user.createMany({
            data: batch.map((econ) => ({
                id: econ.id,
                credits: Math.min(econ.credits, 1e12),
                score: econ.alltimeScore
            })),
            skipDuplicates: true
        });
        console.log(`here2`, userCount.count);

        const dailyBoxCount = await prisma.dailyBox.createMany({
            data: batch.map((econ) => ({
                userId: econ.id,
                tokens: econ.blurrytokens,
                steals: econ.steals,
                blocks: econ.blocks,
                dailyCount: econ.dailyCount
            })),
            skipDuplicates: true
        });

        console.log(`here3`, dailyBoxCount.count);

        await ctx.editReply(`Transferred ${BATCH_SIZE * (i + 1)} economies.`);
    }

    await ctx.editReply(`Transferred ${userEconomies.length} economies. Finished.`);
});

export default command;
