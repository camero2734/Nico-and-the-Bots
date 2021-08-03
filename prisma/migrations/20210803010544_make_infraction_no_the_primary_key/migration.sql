/*
  Warnings:

  - The primary key for the `ViolationNotice` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ViolationNotice` table. All the data in the column will be lost.
  - You are about to drop the `Counter` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "ViolationNotice" DROP CONSTRAINT "ViolationNotice_pkey",
DROP COLUMN "id",
ADD COLUMN     "infractionNumber" SERIAL NOT NULL,
ADD PRIMARY KEY ("infractionNumber");

-- DropTable
DROP TABLE "Counter";
