-- CreateEnum
CREATE TYPE "PerkType" AS ENUM ('DoubleDailyCredits', 'DoubleDailyTokens');

-- CreateTable
CREATE TABLE "Perk" (
    "id" SERIAL NOT NULL,
    "type" "PerkType" NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Perk" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
