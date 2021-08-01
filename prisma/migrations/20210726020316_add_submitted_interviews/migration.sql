-- CreateTable
CREATE TABLE "SubmittedInterview" (
    "url" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "submittedByUserId" TEXT NOT NULL,

    PRIMARY KEY ("url")
);

-- AddForeignKey
ALTER TABLE "SubmittedInterview" ADD FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
