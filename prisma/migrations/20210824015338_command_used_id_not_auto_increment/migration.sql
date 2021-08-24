/*
  Warnings:

  - The primary key for the `CommandUsed` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "CommandUsed" DROP CONSTRAINT "CommandUsed_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "CommandUsed_id_seq";
