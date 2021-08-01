/*
  Warnings:

  - You are about to drop the column `dailyBoxId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `DailyBox` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `DailyBox` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_dailyBoxId_fkey";

-- DropIndex
DROP INDEX "User_dailyBoxId_unique";

-- AlterTable
ALTER TABLE "DailyBox" ADD COLUMN     "userId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dailyBoxId";

-- CreateIndex
CREATE UNIQUE INDEX "DailyBox_userId_unique" ON "DailyBox"("userId");

-- AddForeignKey
ALTER TABLE "DailyBox" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
