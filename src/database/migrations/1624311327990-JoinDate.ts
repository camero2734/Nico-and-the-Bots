import { Client, Intents } from "discord.js";
import { MigrationInterface, QueryRunner } from "typeorm";
import { MongoQueryRunner } from "typeorm/driver/mongodb/MongoQueryRunner";
import * as secrets from "configuration/secrets.json";
import * as R from "ramda";
import { guildID } from "configuration/config";
import { Economy } from "database/entities/Economy";

const bot = new Client({ intents: Intents.ALL });
bot.login(secrets.bots.nico);

const ready = new Promise<void>((resolve) => {
    bot.on("ready", resolve);
});

export class JoinDate1624311327990 implements MigrationInterface {
    public async up(queryRunner: MongoQueryRunner): Promise<void> {
        // Fetch every member's Discord join date and set as the date
        await ready;
        const guild = await bot.guilds.fetch(guildID);
        const members = await guild.members.fetch();

        console.log("Fetched members");

        const joinDates = members.map((m) => ({ id: m.user.id, date: m.joinedAt || new Date() }));

        const writes = joinDates.map((jd) => {
            const econ = new Economy({ userid: jd.id, joinedAt: jd.date }); // New economy if needed
            const econNoJoin = R.omit(["joinedAt"], econ); // Otherwise creates a conflict with $set that mongodb doesn't like
            return {
                updateOne: {
                    filter: { userid: { $eq: jd.id } },
                    update: {
                        $set: { joinedAt: jd.date },
                        $setOnInsert: econNoJoin
                    },
                    upsert: true
                }
            };
        });

        // Set those dates as the join date
        await queryRunner.bulkWrite("economy", writes);

        // Set everyone's date to the current time if they don't have one
        await queryRunner.updateMany("economy", { joinedAt: { $exists: false } }, { $currentDate: { joinedAt: true } });
    }

    public async down(queryRunner: MongoQueryRunner): Promise<void> {
        await queryRunner.updateMany("economy", { joinedAt: { $exists: true } }, { $unset: { joinedAt: "" } });
    }
}
