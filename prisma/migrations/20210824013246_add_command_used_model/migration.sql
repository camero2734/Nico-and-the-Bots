-- CreateTable
CREATE TABLE "CommandUsed" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "identifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommandUsed" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
