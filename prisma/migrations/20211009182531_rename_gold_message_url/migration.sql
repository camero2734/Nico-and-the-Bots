/*
  Warnings:

  - You are about to drop the column `goldMessageUrl` on the `Gold` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Gold"
RENAME COLUMN "goldMessageUrl" TO "houseOfGoldMessageUrl";
