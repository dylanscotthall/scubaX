-- ScubaXcursions initial schema
-- Generated for the v0.3 controlled rebuild.

CREATE TYPE "AppRole" AS ENUM ('CLIENT', 'DIVEMASTER', 'SKIPPER', 'INSTRUCTOR', 'ADMIN', 'OWNER');
CREATE TYPE "CertAgency" AS ENUM ('PADI', 'SSI', 'NAUI', 'CMAS', 'OTHER');
CREATE TYPE "CertLevel" AS ENUM ('OPEN_WATER', 'ADVANCED_OPEN_WATER', 'RESCUE_DIVER', 'DIVEMASTER', 'ASSISTANT_INSTRUCTOR', 'INSTRUCTOR', 'INSTRUCTOR_TRAINER', 'OTHER');
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'CREDITED');
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "EquipmentCategory" AS ENUM ('BCD', 'REGULATOR', 'CYLINDER', 'WEIGHTS', 'WETSUIT', 'FINS', 'MASK', 'DIVE_COMPUTER');
CREATE TYPE "GasType" AS ENUM ('AIR', 'NITROX');
CREATE TYPE "CylinderForm" AS ENUM ('STANDARD', 'TALL');
CREATE TYPE "FinStyle" AS ENUM ('OPEN_HEEL', 'FULL_FOOT');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "cert_agency" "CertAgency",
  "cert_level" "CertLevel",
  "cert_number" TEXT,
  "cert_specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "most_recent_dive_date" TIMESTAMP(3),
  "most_recent_dive_location" TEXT,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_roles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "AppRole" NOT NULL,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "boats" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 10,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "boats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedule_templates" (
  "id" TEXT NOT NULL,
  "boat_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "meet_time" TEXT NOT NULL,
  "launch_time" TEXT NOT NULL,
  "season_label" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dive_sites" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "min_cert_level" "CertLevel",
  "active" BOOLEAN NOT NULL DEFAULT true,
  "closed_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dive_sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "launch_sites" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "launch_sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_follows" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_follows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trips" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "boat_id" TEXT NOT NULL,
  "launch_site_id" TEXT,
  "site_id" TEXT,
  "site_estimated" BOOLEAN NOT NULL DEFAULT false,
  "trip_date" TIMESTAMP(3) NOT NULL,
  "meet_time" TEXT NOT NULL,
  "launch_time" TEXT NOT NULL,
  "capacity_override" INTEGER,
  "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
  "cancelled_at" TIMESTAMP(3),
  "cancelled_reason" TEXT,
  "cancelled_by_id" TEXT,
  "skipper_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
  "id" TEXT NOT NULL,
  "trip_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trip_waitlist_entries" (
  "id" TEXT NOT NULL,
  "trip_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notified_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "trip_waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courses" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "agency" "CertAgency",
  "prerequisite_cert_level" "CertLevel",
  "price" DECIMAL(10,2),
  "instructor_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_sessions" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "session_date" TIMESTAMP(3) NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "location_type" TEXT NOT NULL,
  "site_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_enrollments" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "equipment_items" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "EquipmentCategory" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "equipment_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_equipment_profiles" (
  "user_id" TEXT NOT NULL,
  "bcd_size" TEXT,
  "wetsuit_size" TEXT,
  "preferred_gas_type" "GasType",
  "preferred_nitrox_percent" INTEGER,
  "preferred_cylinder_volume_litres" INTEGER,
  "preferred_cylinder_form" "CylinderForm",
  "preferred_weight_kg" DECIMAL(4,1),
  "shoe_size_uk" DECIMAL(3,1),
  "fin_style" "FinStyle",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_equipment_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "booking_equipment_requests" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "equipment_item_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "requested_size" TEXT,
  "gas_type" "GasType",
  "nitrox_percent" INTEGER,
  "cylinder_volume_litres" INTEGER,
  "cylinder_form" "CylinderForm",
  "requested_weight_kg" DECIMAL(4,1),
  "shoe_size_uk" DECIMAL(3,1),
  "fin_style" "FinStyle",
  "client_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_equipment_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "booking_id" TEXT,
  "course_enrollment_id" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "gateway" TEXT,
  "gateway_ref" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credits" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reason" TEXT,
  "source_booking_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'available',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "used_at" TIMESTAMP(3),
  CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waivers" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waivers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waiver_signatures" (
  "id" TEXT NOT NULL,
  "waiver_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "trip_id" TEXT NOT NULL,
  "available_from" TIMESTAMP(3) NOT NULL,
  "signed_at" TIMESTAMP(3),
  CONSTRAINT "waiver_signatures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expo_push_token" TEXT NOT NULL,
  "device_info" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "related_entity_type" TEXT,
  "related_entity_id" TEXT,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_conditions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'placeholder',
  "recorded_at" TIMESTAMP(3) NOT NULL,
  "significant_wave_height_m" DOUBLE PRECISION,
  "max_wave_height_m" DOUBLE PRECISION,
  "mean_wave_period_s" DOUBLE PRECISION,
  "wind_speed_mps" DOUBLE PRECISION,
  "wind_direction_deg" INTEGER,
  "air_temperature_c" DOUBLE PRECISION,
  "air_pressure_hpa" DOUBLE PRECISION,
  "current_speed_mps" DOUBLE PRECISION,
  "current_direction_deg" INTEGER,
  "sea_surface_temp_c" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_conditions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");
CREATE INDEX "boats_organization_id_idx" ON "boats"("organization_id");
CREATE INDEX "dive_sites_organization_id_idx" ON "dive_sites"("organization_id");
CREATE UNIQUE INDEX "launch_sites_organization_id_name_key" ON "launch_sites"("organization_id", "name");
CREATE INDEX "launch_sites_organization_id_active_idx" ON "launch_sites"("organization_id", "active");
CREATE UNIQUE INDEX "site_follows_user_id_site_id_key" ON "site_follows"("user_id", "site_id");
CREATE INDEX "trips_organization_id_idx" ON "trips"("organization_id");
CREATE INDEX "trips_boat_id_trip_date_idx" ON "trips"("boat_id", "trip_date");
CREATE UNIQUE INDEX "bookings_trip_id_user_id_key" ON "bookings"("trip_id", "user_id");
CREATE INDEX "bookings_trip_id_idx" ON "bookings"("trip_id");
CREATE UNIQUE INDEX "trip_waitlist_entries_trip_id_user_id_key" ON "trip_waitlist_entries"("trip_id", "user_id");
CREATE INDEX "courses_organization_id_idx" ON "courses"("organization_id");
CREATE UNIQUE INDEX "course_enrollments_course_id_user_id_key" ON "course_enrollments"("course_id", "user_id");
CREATE UNIQUE INDEX "equipment_items_organization_id_slug_key" ON "equipment_items"("organization_id", "slug");
CREATE INDEX "equipment_items_organization_id_category_active_idx" ON "equipment_items"("organization_id", "category", "active");
CREATE UNIQUE INDEX "booking_equipment_requests_booking_id_equipment_item_id_key" ON "booking_equipment_requests"("booking_id", "equipment_item_id");
CREATE INDEX "booking_equipment_requests_equipment_item_id_requested_size_idx" ON "booking_equipment_requests"("equipment_item_id", "requested_size");
CREATE INDEX "booking_equipment_requests_gas_type_nitrox_percent_idx" ON "booking_equipment_requests"("gas_type", "nitrox_percent");
CREATE INDEX "waivers_organization_id_idx" ON "waivers"("organization_id");
CREATE UNIQUE INDEX "waiver_signatures_trip_id_user_id_key" ON "waiver_signatures"("trip_id", "user_id");
CREATE UNIQUE INDEX "push_tokens_expo_push_token_key" ON "push_tokens"("expo_push_token");
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "site_conditions_organization_id_recorded_at_idx" ON "site_conditions"("organization_id", "recorded_at");

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boats" ADD CONSTRAINT "boats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dive_sites" ADD CONSTRAINT "dive_sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "launch_sites" ADD CONSTRAINT "launch_sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_follows" ADD CONSTRAINT "site_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_follows" ADD CONSTRAINT "site_follows_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "dive_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_launch_site_id_fkey" FOREIGN KEY ("launch_site_id") REFERENCES "launch_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "dive_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_skipper_id_fkey" FOREIGN KEY ("skipper_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_waitlist_entries" ADD CONSTRAINT "trip_waitlist_entries_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_waitlist_entries" ADD CONSTRAINT "trip_waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_equipment_profiles" ADD CONSTRAINT "user_equipment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_equipment_requests" ADD CONSTRAINT "booking_equipment_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_equipment_requests" ADD CONSTRAINT "booking_equipment_requests_equipment_item_id_fkey" FOREIGN KEY ("equipment_item_id") REFERENCES "equipment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_enrollment_id_fkey" FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credits" ADD CONSTRAINT "credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waiver_signatures" ADD CONSTRAINT "waiver_signatures_waiver_id_fkey" FOREIGN KEY ("waiver_id") REFERENCES "waivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waiver_signatures" ADD CONSTRAINT "waiver_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "waiver_signatures" ADD CONSTRAINT "waiver_signatures_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_conditions" ADD CONSTRAINT "site_conditions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
