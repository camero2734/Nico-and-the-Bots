/*
  Warnings:

  - The `warnedForDeletion` column on the `Concert` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Concert" DROP COLUMN "warnedForDeletion",
ADD COLUMN     "warnedForDeletion" TIMESTAMP(3);
