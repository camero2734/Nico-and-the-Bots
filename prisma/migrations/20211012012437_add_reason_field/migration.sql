/*
  Warnings:

  - Added the required column `reason` to the `UserMessageReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserMessageReport" ADD COLUMN     "reason" TEXT NOT NULL;
