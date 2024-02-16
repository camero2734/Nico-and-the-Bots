/*
  Warnings:

  - Added the required column `staffMessageUrl` to the `UserMessageReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserMessageReport" ADD COLUMN     "staffMessageUrl" TEXT NOT NULL;
