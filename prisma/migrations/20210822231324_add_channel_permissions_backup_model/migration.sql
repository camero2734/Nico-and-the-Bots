-- CreateTable
CREATE TABLE "ChannelPermissionsBackup" (
    "channelId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("channelId")
);
