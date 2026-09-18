-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "party_size" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guest_equipment_requests" (
    "id" TEXT NOT NULL,
    "booking_guest_id" TEXT NOT NULL,
    "equipment_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "requested_size" TEXT,
    "gas_type" "GasType",
    "nitrox_percent" INTEGER,
    "cylinder_volume_litres" INTEGER,
    "cylinder_form" "CylinderForm",
    "requested_weight_kg" DECIMAL(4,1),
    "weight_carry_method" "WeightCarryMethod",
    "shoe_size_uk" DECIMAL(3,1),
    "fin_style" "FinStyle",
    "client_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_guest_equipment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_guests_booking_id_idx" ON "booking_guests"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_guests_booking_id_position_key" ON "booking_guests"("booking_id", "position");

-- CreateIndex
CREATE INDEX "booking_guest_equipment_requests_equipment_item_id_requeste_idx" ON "booking_guest_equipment_requests"("equipment_item_id", "requested_size");

-- CreateIndex
CREATE INDEX "booking_guest_equipment_requests_gas_type_nitrox_percent_idx" ON "booking_guest_equipment_requests"("gas_type", "nitrox_percent");

-- CreateIndex
CREATE UNIQUE INDEX "booking_guest_equipment_requests_booking_guest_id_equipment_key" ON "booking_guest_equipment_requests"("booking_guest_id", "equipment_item_id");

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guest_equipment_requests" ADD CONSTRAINT "booking_guest_equipment_requests_booking_guest_id_fkey" FOREIGN KEY ("booking_guest_id") REFERENCES "booking_guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guest_equipment_requests" ADD CONSTRAINT "booking_guest_equipment_requests_equipment_item_id_fkey" FOREIGN KEY ("equipment_item_id") REFERENCES "equipment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
