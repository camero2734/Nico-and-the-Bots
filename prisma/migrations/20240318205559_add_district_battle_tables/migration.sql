-- CreateTable
CREATE TABLE "DistrictBattle" (
    "id" TEXT NOT NULL,
    "attacker" "BishopType" NOT NULL,
    "defender" "BishopType" NOT NULL,
    "battleIdx" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credits" INTEGER NOT NULL,

    CONSTRAINT "DistrictBattle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictBattleGuess" (
    "userId" TEXT NOT NULL,
    "dailyDistrictBattleId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DistrictBattle_attacker_battleIdx_key" ON "DistrictBattle"("attacker", "battleIdx");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictBattle_defender_battleIdx_key" ON "DistrictBattle"("defender", "battleIdx");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictBattleGuess_dailyDistrictBattleId_userId_key" ON "DistrictBattleGuess"("dailyDistrictBattleId", "userId");

-- AddForeignKey
ALTER TABLE "DistrictBattleGuess" ADD CONSTRAINT "DistrictBattleGuess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictBattleGuess" ADD CONSTRAINT "DistrictBattleGuess_dailyDistrictBattleId_fkey" FOREIGN KEY ("dailyDistrictBattleId") REFERENCES "DistrictBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
