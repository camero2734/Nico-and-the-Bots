/*
  Warnings:

  - The primary key for the `SubmittedInterview` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[url]` on the table `SubmittedInterview` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SubmittedInterview" DROP CONSTRAINT "SubmittedInterview_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "SubmittedInterview.url_unique" ON "SubmittedInterview"("url");
