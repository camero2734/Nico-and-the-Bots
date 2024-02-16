-- CreateTable
CREATE TABLE "UserLastFM" (
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("username")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLastFM.userId_unique" ON "UserLastFM"("userId");

-- AddForeignKey
ALTER TABLE "UserLastFM" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
