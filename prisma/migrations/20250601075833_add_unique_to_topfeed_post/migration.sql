/*
  Warnings:

  - A unique constraint covering the columns `[id,type,subtype,handle]` on the table `TopfeedPost` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TopfeedPost_id_type_subtype_handle_key" ON "TopfeedPost"("id", "type", "subtype", "handle");
