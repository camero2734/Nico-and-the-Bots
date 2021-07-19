-- CreateTable
CREATE TABLE "DailyBox" (
    "id" SERIAL NOT NULL,
    "tokens" INTEGER NOT NULL,
    "steals" INTEGER NOT NULL,
    "blocks" INTEGER NOT NULL,
    "ingots" INTEGER NOT NULL,
    "trophies" INTEGER NOT NULL,
    "lastDaily" INTEGER NOT NULL,
    "dailyCount" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGINT NOT NULL,
    "credits" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "dailyBoxId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_dailyBoxId_unique" ON "User"("dailyBoxId");

-- AddForeignKey
ALTER TABLE "User" ADD FOREIGN KEY ("dailyBoxId") REFERENCES "DailyBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
