-- CreateTable
CREATE TABLE "FirebreatherApplication" (
    "applicationId" TEXT NOT NULL,
    "sentToStaff" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "approved" BOOLEAN,
    "decidedAt" TIMESTAMP(3),
    "responseData" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FirebreatherApplication_pkey" PRIMARY KEY ("applicationId")
);

-- AddForeignKey
ALTER TABLE "FirebreatherApplication" ADD CONSTRAINT "FirebreatherApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
