-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "uses" INTEGER NOT NULL,
    "userId" BIGINT,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tag" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
