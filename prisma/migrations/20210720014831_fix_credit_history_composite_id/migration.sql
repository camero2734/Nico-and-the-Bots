/*
  Warnings:

  - The primary key for the `CreditHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "CreditHistory" DROP CONSTRAINT "CreditHistory_pkey",
ADD PRIMARY KEY ("date", "userId");
