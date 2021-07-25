/*
  Warnings:

  - Added the required column `channelId` to the `Warning` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editedAt` to the `Warning` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Warning" ADD COLUMN     "channelId" TEXT NOT NULL,
ADD COLUMN     "editedAt" TIMESTAMP(3) NOT NULL;
