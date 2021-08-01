/*
  Warnings:

  - You are about to drop the `VerifiedQuizResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VerifiedQuizResult" DROP CONSTRAINT "VerifiedQuizResult_userId_fkey";

-- DropTable
DROP TABLE "VerifiedQuizResult";

-- CreateTable
CREATE TABLE "VerifiedQuizAnswer" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("questionId")
);

-- AddForeignKey
ALTER TABLE "VerifiedQuizAnswer" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
