-- CreateTable
CREATE TABLE "MessageReference" (
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MessageReference_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageReference_name_key" ON "MessageReference"("name");
