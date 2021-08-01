/*
  Warnings:

  - You are about to drop the `CreditHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CreditHistory" DROP CONSTRAINT "CreditHistory_userId_fkey";

-- DropTable
DROP TABLE "CreditHistory";

-- CreateTable
CREATE TABLE "MessageHistory" (
    "date" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("date","userId")
);

-- AddForeignKey
ALTER TABLE "MessageHistory" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
