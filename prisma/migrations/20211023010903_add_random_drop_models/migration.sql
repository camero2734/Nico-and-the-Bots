-- CreateTable
CREATE TABLE "RandomDrop" (
    "id" TEXT NOT NULL,
    "winningIdices" INTEGER[],

    CONSTRAINT "RandomDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RandomDropGuess" (
    "userId" TEXT NOT NULL,
    "randomDropId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RandomDropGuess_randomDropId_idx_key" ON "RandomDropGuess"("randomDropId", "idx");

-- AddForeignKey
ALTER TABLE "RandomDropGuess" ADD CONSTRAINT "RandomDropGuess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RandomDropGuess" ADD CONSTRAINT "RandomDropGuess_randomDropId_fkey" FOREIGN KEY ("randomDropId") REFERENCES "RandomDrop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
