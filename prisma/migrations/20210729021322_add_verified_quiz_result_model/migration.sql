-- AlterTable
ALTER TABLE "VerifiedQuiz" ADD COLUMN     "answersGiven" INTEGER[];

-- CreateTable
CREATE TABLE "VerifiedQuizResult" (
    "userId" TEXT NOT NULL,
    "questionOrder" INTEGER[],
    "answersGiven" INTEGER[],
    "timeTaken" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "VerifiedQuizResult" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
