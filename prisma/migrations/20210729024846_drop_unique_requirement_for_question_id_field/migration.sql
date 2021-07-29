/*
  Warnings:

  - The primary key for the `VerifiedQuizAnswer` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "VerifiedQuizAnswer" DROP CONSTRAINT "VerifiedQuizAnswer_pkey",
ADD PRIMARY KEY ("id");
