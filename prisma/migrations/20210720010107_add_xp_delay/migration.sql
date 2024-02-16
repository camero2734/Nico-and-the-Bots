/*
  Warnings:

  - The primary key for the `DailyBox` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `DailyBox` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DailyBox_userId_unique";

-- AlterTable
ALTER TABLE "DailyBox" DROP CONSTRAINT "DailyBox_pkey",
DROP COLUMN "id",
ADD PRIMARY KEY ("userId");

-- CreateTable
CREATE TABLE "XPDelay" (
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "nextTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "XPDelay" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
