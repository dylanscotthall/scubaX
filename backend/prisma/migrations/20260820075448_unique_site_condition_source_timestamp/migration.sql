/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,source,recorded_at]` on the table `site_conditions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "site_conditions_organization_id_source_recorded_at_key" ON "site_conditions"("organization_id", "source", "recorded_at");
