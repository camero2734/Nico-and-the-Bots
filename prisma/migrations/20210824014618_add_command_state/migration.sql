-- CreateEnum
CREATE TYPE "CommandState" AS ENUM ('Started', 'Finished', 'Errored');

-- AlterTable
ALTER TABLE "CommandUsed" ADD COLUMN     "state" "CommandState" NOT NULL DEFAULT E'Started';
