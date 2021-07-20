/*
  Warnings:

  - The primary key for the `DailyBox` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `userId` on table `Tag` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_dailyBoxId_fkey";

-- AlterTable
ALTER TABLE "DailyBox" DROP CONSTRAINT "DailyBox_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "DailyBox_id_seq";

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "dailyBoxId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD FOREIGN KEY ("dailyBoxId") REFERENCES "DailyBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
