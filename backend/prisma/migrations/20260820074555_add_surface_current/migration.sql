/*
  Warnings:

  - You are about to drop the column `current_speed_mps` on the `site_conditions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "site_conditions" DROP COLUMN "current_speed_mps",
ADD COLUMN     "mean_current_speed_mps" DOUBLE PRECISION,
ADD COLUMN     "surface_current_speed_mps" DOUBLE PRECISION;
