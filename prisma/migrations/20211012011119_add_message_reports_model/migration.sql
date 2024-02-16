-- CreateTable
CREATE TABLE "UserMessageReport" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reportedByUserId" TEXT NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserMessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMessageReport_messageId_reportedByUserId_key" ON "UserMessageReport"("messageId", "reportedByUserId");

-- AddForeignKey
ALTER TABLE "UserMessageReport" ADD CONSTRAINT "UserMessageReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMessageReport" ADD CONSTRAINT "UserMessageReport_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
