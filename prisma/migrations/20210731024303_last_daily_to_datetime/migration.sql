/*
  Warnings:

  - The `lastDaily` column on the `DailyBox` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "DailyBox" DROP COLUMN "lastDaily",
ADD COLUMN     "lastDaily" TIMESTAMP(3);
