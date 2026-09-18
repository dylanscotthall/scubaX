-- CreateEnum
CREATE TYPE "WeightCarryMethod" AS ENUM ('BELT', 'POCKETS');

-- AlterTable
ALTER TABLE "booking_equipment_requests" ADD COLUMN     "weight_carry_method" "WeightCarryMethod";

-- AlterTable
ALTER TABLE "user_equipment_profiles" ADD COLUMN     "preferred_weight_carry_method" "WeightCarryMethod";
