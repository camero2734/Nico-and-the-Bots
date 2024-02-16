-- CreateTable
CREATE TABLE "ColorRole" (
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,

    PRIMARY KEY ("roleId","userId")
);

-- AddForeignKey
ALTER TABLE "ColorRole" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
