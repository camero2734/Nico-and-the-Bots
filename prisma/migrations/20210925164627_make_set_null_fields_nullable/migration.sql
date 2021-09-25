-- AlterTable
ALTER TABLE "Gold" ALTER COLUMN "fromUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Poll" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubmittedInterview" ALTER COLUMN "submittedByUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Warning" ALTER COLUMN "issuedByUserId" DROP NOT NULL;
