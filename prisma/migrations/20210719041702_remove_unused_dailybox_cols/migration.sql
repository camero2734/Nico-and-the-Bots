/*
  Warnings:

  - You are about to drop the column `ingots` on the `DailyBox` table. All the data in the column will be lost.
  - You are about to drop the column `trophies` on the `DailyBox` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyBox" DROP COLUMN "ingots",
DROP COLUMN "trophies";
