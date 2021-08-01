-- CreateTable
CREATE TABLE "CreditHistory" (
    "date" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("date","messageCount")
);

-- AddForeignKey
ALTER TABLE "CreditHistory" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
