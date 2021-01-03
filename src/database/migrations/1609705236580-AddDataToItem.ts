import {MigrationInterface, QueryRunner} from "typeorm";

export class AddDataToItem1609705236580 implements MigrationInterface {
    name = 'AddDataToItem1609705236580'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_item" ("c" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "id" text NOT NULL, "title" text NOT NULL, "type" text NOT NULL, "time" integer NOT NULL, "data" text)`);
        await queryRunner.query(`INSERT INTO "temporary_item"("c", "id", "title", "type", "time") SELECT "c", "id", "title", "type", "time" FROM "item"`);
        await queryRunner.query(`DROP TABLE "item"`);
        await queryRunner.query(`ALTER TABLE "temporary_item" RENAME TO "item"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "item" RENAME TO "temporary_item"`);
        await queryRunner.query(`CREATE TABLE "item" ("c" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "id" text NOT NULL, "title" text NOT NULL, "type" text NOT NULL, "time" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "item"("c", "id", "title", "type", "time") SELECT "c", "id", "title", "type", "time" FROM "temporary_item"`);
        await queryRunner.query(`DROP TABLE "temporary_item"`);
    }

}
