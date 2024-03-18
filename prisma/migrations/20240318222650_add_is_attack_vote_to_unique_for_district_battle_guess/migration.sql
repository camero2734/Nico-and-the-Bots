/*
  Warnings:

  - A unique constraint covering the columns `[dailyDistrictBattleId,userId,isAttackVote]` on the table `DistrictBattleGuess` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DistrictBattleGuess_dailyDistrictBattleId_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "DistrictBattleGuess_dailyDistrictBattleId_userId_isAttackVo_key" ON "DistrictBattleGuess"("dailyDistrictBattleId", "userId", "isAttackVote");
