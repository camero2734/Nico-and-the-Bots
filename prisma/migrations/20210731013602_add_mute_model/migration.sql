-- CreateTable
CREATE TABLE "Mute" (
    "id" SERIAL NOT NULL,
    "reason" TEXT,
    "channelId" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "mutedUserId" TEXT NOT NULL,
    "issuedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mute" ADD FOREIGN KEY ("mutedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mute" ADD FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
