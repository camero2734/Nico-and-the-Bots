/*
  Warnings:

  - You are about to drop the column `choice` on the `Vote` table. All the data in the column will be lost.

  it's okay i fixed it manually i think ^^^
*/
-- AlterTable
ALTER TABLE "Vote"
  ALTER COLUMN choice TYPE INTEGER[]
      USING array[choice]::INTEGER[];
  
ALTER TABLE "Vote" RENAME COLUMN choice TO choices;
