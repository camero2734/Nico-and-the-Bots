/*
  Warnings:

  - You are about to drop the column `sentToStaff` on the `FirebreatherApplication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FirebreatherApplication" DROP COLUMN "sentToStaff",
ADD COLUMN     "messageUrl" TEXT;
