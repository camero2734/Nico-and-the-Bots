/*
  Warnings:

  - You are about to drop the `RandomDrop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RandomDropGuess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RandomDropGuess" DROP CONSTRAINT "RandomDropGuess_randomDropId_fkey";

-- DropForeignKey
ALTER TABLE "RandomDropGuess" DROP CONSTRAINT "RandomDropGuess_userId_fkey";

-- DropTable
DROP TABLE "RandomDrop";

-- DropTable
DROP TABLE "RandomDropGuess";
