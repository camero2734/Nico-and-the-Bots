/*
  Warnings:

  - Added the required column `maxGuessesPerUser` to the `RandomDrop` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RandomDrop" ADD COLUMN     "maxGuessesPerUser" INTEGER NOT NULL,
ADD COLUMN     "winningIndices" INTEGER[];
