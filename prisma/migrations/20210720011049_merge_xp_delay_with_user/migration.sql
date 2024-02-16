/*
  Warnings:

  - You are about to drop the `XPDelay` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "XPDelay" DROP CONSTRAINT "XPDelay_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastMessageSent" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "XPDelay";
