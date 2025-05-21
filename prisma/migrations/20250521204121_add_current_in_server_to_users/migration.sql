-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentlyInServer" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "User_currentlyInServer_idx" ON "User"("currentlyInServer");
