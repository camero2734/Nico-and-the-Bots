-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('PossessionOfContraband', 'FailedPerimeterEscape', 'ConspiracyAndTreason');

-- CreateEnum
CREATE TYPE "BishopType" AS ENUM ('Nico', 'Reisdro', 'Sacarver', 'Nills', 'Keons', 'Lisden', 'Andre', 'Vetomo', 'Listo');

-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "ViolationNotice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "violation" "ViolationType" NOT NULL,
    "givenBy" "BishopType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ViolationNotice" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
