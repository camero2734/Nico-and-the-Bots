-- CreateEnum
CREATE TYPE "WarningType" AS ENUM ('BotheringOthers', 'Drama', 'Spam', 'NsfwOrSlurs', 'Other');

-- CreateTable
CREATE TABLE "Warning" (
    "id" SERIAL NOT NULL,
    "reason" TEXT NOT NULL,
    "type" "WarningType" NOT NULL,
    "severity" INTEGER NOT NULL,
    "warnedUserId" TEXT NOT NULL,
    "issuedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Warning" ADD FOREIGN KEY ("warnedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
