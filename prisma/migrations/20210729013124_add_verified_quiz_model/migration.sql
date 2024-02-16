-- CreateTable
CREATE TABLE "VerifiedQuiz" (
    "userId" TEXT NOT NULL,
    "lastTaken" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "VerifiedQuiz" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
