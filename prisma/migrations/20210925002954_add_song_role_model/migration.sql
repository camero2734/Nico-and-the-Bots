-- CreateTable
CREATE TABLE "SongRole" (
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SongRole_pkey" PRIMARY KEY ("roleId","userId")
);

-- AddForeignKey
ALTER TABLE "SongRole" ADD CONSTRAINT "SongRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
