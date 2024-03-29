/*
  Warnings:

  - You are about to drop the column `battleIdx` on the `DistrictBattle` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `DistrictBattle` table. All the data in the column will be lost.
  - Added the required column `battleGroupId` to the `DistrictBattle` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DistrictBattle_attacker_battleIdx_key";

-- DropIndex
DROP INDEX "DistrictBattle_defender_battleIdx_key";

-- AlterTable
ALTER TABLE "DistrictBattle" DROP COLUMN "battleIdx",
DROP COLUMN "createdAt",
ADD COLUMN     "battleGroupId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "DistrictBattleGroup" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistrictBattleGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DistrictBattle" ADD CONSTRAINT "DistrictBattle_battleGroupId_fkey" FOREIGN KEY ("battleGroupId") REFERENCES "DistrictBattleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
