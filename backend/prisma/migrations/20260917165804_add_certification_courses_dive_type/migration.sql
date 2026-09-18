-- CreateEnum
CREATE TYPE "DiveType" AS ENUM ('SNORKEL', 'SCUBA', 'DEEP', 'BAITED_SHARK_SNORKEL', 'BAITED_SHARK_SCUBA');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "grants_cert_level" "CertLevel",
ADD COLUMN     "grants_specialty" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "dive_type" "DiveType";
