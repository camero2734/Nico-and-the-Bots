/*
  Warnings:

  - Added the required column `data` to the `TopfeedPost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TopfeedPost" ADD COLUMN     "data" JSONB NOT NULL;
