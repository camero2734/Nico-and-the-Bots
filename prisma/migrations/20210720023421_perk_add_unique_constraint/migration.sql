/*
  Warnings:

  - A unique constraint covering the columns `[userId,type]` on the table `Perk` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Perk.userId_type_unique" ON "Perk"("userId", "type");
