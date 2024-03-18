/*
  Warnings:

  - A unique constraint covering the columns `[battleGroupId,attacker]` on the table `DistrictBattle` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[battleGroupId,defender]` on the table `DistrictBattle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DistrictBattle_battleGroupId_attacker_key" ON "DistrictBattle"("battleGroupId", "attacker");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictBattle_battleGroupId_defender_key" ON "DistrictBattle"("battleGroupId", "defender");
