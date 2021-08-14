-- CreateEnum
CREATE TYPE "TopfeedType" AS ENUM ('Twitter', 'Instagram', 'Website');

-- CreateTable
CREATE TABLE "TopfeedPost" (
    "id" TEXT NOT NULL,
    "type" "TopfeedType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);
