/*
  Warnings:

  - Added the required column `channelId` to the `Gold` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageId` to the `Gold` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Gold" ADD COLUMN     "channelId" TEXT NOT NULL,
ADD COLUMN     "messageId" TEXT NOT NULL;
