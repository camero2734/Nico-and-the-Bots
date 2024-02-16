/*
  Warnings:

  - Added the required column `prize` to the `RandomDrop` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RandomDrop" ADD COLUMN     "prize" JSONB NOT NULL;
