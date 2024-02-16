/*
  Warnings:

  - You are about to drop the column `createdAt` on the `RandomDropGuess` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RandomDrop" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RandomDropGuess" DROP COLUMN "createdAt";
