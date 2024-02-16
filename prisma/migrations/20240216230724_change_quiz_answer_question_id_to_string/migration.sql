-- Clear existing answers in wrong format, we'll start fresh
DELETE FROM "VerifiedQuizAnswer";
-- AlterTable
ALTER TABLE "VerifiedQuizAnswer" ALTER COLUMN "questionId" SET DATA TYPE TEXT;
