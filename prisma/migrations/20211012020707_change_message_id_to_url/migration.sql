/*
  Warnings:

  - You are about to drop the column `messageId` on the `UserMessageReport` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[messageUrl,reportedByUserId]` on the table `UserMessageReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `messageUrl` to the `UserMessageReport` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserMessageReport_messageId_reportedByUserId_key";

-- AlterTable
ALTER TABLE "UserMessageReport" DROP COLUMN "messageId",
ADD COLUMN     "messageUrl" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserMessageReport_messageUrl_reportedByUserId_key" ON "UserMessageReport"("messageUrl", "reportedByUserId");
