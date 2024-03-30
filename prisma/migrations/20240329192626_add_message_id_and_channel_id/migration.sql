/*
  Warnings:

  - Added the required column `channelId` to the `District` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageId` to the `DistrictBattle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "District" ADD COLUMN     "channelId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DistrictBattle" ADD COLUMN     "messageId" TEXT NOT NULL;
