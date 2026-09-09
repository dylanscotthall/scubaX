import dotenv from "dotenv";
dotenv.config();

import {
  AppRole,
  BookingStatus,
  CertAgency,
  CertLevel,
  CylinderForm,
  EnrollmentStatus,
  FinStyle,
  GasType,
  PrismaClient,
  TripStatus,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  BASE_BOATS,
  BASE_DIVE_SITES,
  BASE_EQUIPMENT,
  BASE_LAUNCH_SITES,
  DEFAULT_ORGANIZATION_ID,
  seedBase,
} from "./seed";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run seed.dev.ts with NODE_ENV=production");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the development seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEV_ADMIN_ID = "40000000-0000-0000-0000-000000000001";
const DEV_CLIENT_ID = "40000000-0000-0000-0000-000000000002";
const DEV_TRIP_IDS = [
  "50000000-0000-0000-0000-000000000001",
  "50000000-0000-0000-0000-000000000002",
  "50000000-0000-0000-0000-000000000003",
] as const;
const DEV_COURSE_ID = "60000000-0000-0000-0000-000000000001";

function futureDate(daysFromToday: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      12,
      0,
      0,
      0,
    ),
  );
}

async function ensureDevUser(input: {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: AppRole[];
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      })
    : await prisma.user.create({
        data: {
          id: input.id,
          organizationId: DEFAULT_ORGANIZATION_ID,
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          certSpecialties: [],
        },
      });

  for (const role of input.roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role },
      update: {},
    });
  }

  return user;
}

async function main() {
  await seedBase(prisma);

  const adminEmail =
    process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase() ||
    "admin@scubaxcursion.local";
  const adminPassword =
    process.env.DEV_ADMIN_PASSWORD || "LocalAdmin123!";
  const clientEmail =
    process.env.DEV_CLIENT_EMAIL?.trim().toLowerCase() ||
    "client@scubaxcursion.local";
  const clientPassword =
    process.env.DEV_CLIENT_PASSWORD || "LocalClient123!";

  const admin = await ensureDevUser({
    id: DEV_ADMIN_ID,
    email: adminEmail,
    password: adminPassword,
    firstName: "Local",
    lastName: "Admin",
    roles: [
      AppRole.CLIENT,
      AppRole.ADMIN,
      AppRole.OWNER,
      AppRole.INSTRUCTOR,
      AppRole.SKIPPER,
      AppRole.DIVEMASTER,
    ],
  });

  const client = await ensureDevUser({
    id: DEV_CLIENT_ID,
    email: clientEmail,
    password: clientPassword,
    firstName: "Test",
    lastName: "Diver",
    roles: [AppRole.CLIENT],
  });

  await prisma.user.update({
    where: { id: client.id },
    data: {
      certAgency: CertAgency.SSI,
      certLevel: CertLevel.ADVANCED_OPEN_WATER,
      certNumber: "DEV-SSI-001",
      certSpecialties: ["Nitrox", "Deep"],
      mostRecentDiveDate: futureDate(-14),
      mostRecentDiveLoc: "Aliwal Shoal",
    },
  });

  await prisma.userEquipmentProfile.upsert({
    where: { userId: client.id },
    create: {
      userId: client.id,
      bcdSize: "M",
      wetsuitSize: "M",
      preferredGasType: GasType.NITROX,
      preferredNitroxPercent: 32,
      preferredCylinderVolumeLitres: 12,
      preferredCylinderForm: CylinderForm.STANDARD,
      preferredWeightKg: 8,
      shoeSizeUk: 9,
      finStyle: FinStyle.OPEN_HEEL,
    },
    update: {
      bcdSize: "M",
      wetsuitSize: "M",
      preferredGasType: GasType.NITROX,
      preferredNitroxPercent: 32,
      preferredCylinderVolumeLitres: 12,
      preferredCylinderForm: CylinderForm.STANDARD,
      preferredWeightKg: 8,
      shoeSizeUk: 9,
      finStyle: FinStyle.OPEN_HEEL,
    },
  });

  const participantUsers: Awaited<ReturnType<typeof ensureDevUser>>[] = [];
  for (let index = 1; index <= 10; index += 1) {
    participantUsers.push(
      await ensureDevUser({
        id: `41000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
        email: `diver${index}@scubaxcursion.local`,
        password: "LocalDiver123!",
        firstName: "Demo",
        lastName: `Diver ${index}`,
        roles: [AppRole.CLIENT],
      }),
    );
  }

  const trips = [
    {
      id: DEV_TRIP_IDS[0],
      boatId: BASE_BOATS[0].id,
      launchSiteId: BASE_LAUNCH_SITES[0].id,
      siteId: BASE_DIVE_SITES[0].id,
      siteEstimated: false,
      tripDate: futureDate(2),
      meetTime: "07:00",
      launchTime: "08:00",
    },
    {
      id: DEV_TRIP_IDS[1],
      boatId: BASE_BOATS[1].id,
      launchSiteId: BASE_LAUNCH_SITES[0].id,
      siteId: null,
      siteEstimated: true,
      tripDate: futureDate(4),
      meetTime: "07:00",
      launchTime: "08:00",
    },
    {
      id: DEV_TRIP_IDS[2],
      boatId: BASE_BOATS[0].id,
      launchSiteId: BASE_LAUNCH_SITES[0].id,
      siteId: BASE_DIVE_SITES[9].id,
      siteEstimated: false,
      tripDate: futureDate(6),
      meetTime: "05:00",
      launchTime: "06:00",
    },
  ];

  for (const trip of trips) {
    await prisma.trip.upsert({
      where: { id: trip.id },
      create: {
        ...trip,
        organizationId: DEFAULT_ORGANIZATION_ID,
        createdById: admin.id,
        skipperId: admin.id,
        status: TripStatus.SCHEDULED,
      },
      update: {
        boatId: trip.boatId,
        launchSiteId: trip.launchSiteId,
        siteId: trip.siteId,
        siteEstimated: trip.siteEstimated,
        tripDate: trip.tripDate,
        meetTime: trip.meetTime,
        launchTime: trip.launchTime,
        skipperId: admin.id,
        status: TripStatus.SCHEDULED,
        cancelledAt: null,
        cancelledReason: null,
        cancelledById: null,
      },
    });
  }

  for (const participant of participantUsers.slice(0, 6)) {
    await prisma.booking.upsert({
      where: {
        tripId_userId: { tripId: DEV_TRIP_IDS[0], userId: participant.id },
      },
      create: {
        tripId: DEV_TRIP_IDS[0],
        userId: participant.id,
        status: BookingStatus.CONFIRMED,
      },
      update: { status: BookingStatus.CONFIRMED, cancelledAt: null },
    });
  }

  await prisma.booking.updateMany({
    where: {
      tripId: DEV_TRIP_IDS[2],
      userId: { in: participantUsers.slice(9).map((participant) => participant.id) },
      status: BookingStatus.CONFIRMED,
    },
    data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
  });

  for (const participant of participantUsers.slice(0, 9)) {
    await prisma.booking.upsert({
      where: {
        tripId_userId: { tripId: DEV_TRIP_IDS[2], userId: participant.id },
      },
      create: {
        tripId: DEV_TRIP_IDS[2],
        userId: participant.id,
        status: BookingStatus.CONFIRMED,
      },
      update: { status: BookingStatus.CONFIRMED, cancelledAt: null },
    });
  }

  const manifestBooking = await prisma.booking.findUniqueOrThrow({
    where: {
      tripId_userId: {
        tripId: DEV_TRIP_IDS[0],
        userId: participantUsers[0].id,
      },
    },
  });
  await prisma.bookingEquipmentRequest.deleteMany({
    where: { bookingId: manifestBooking.id },
  });
  await prisma.bookingEquipmentRequest.createMany({
    data: [
      {
        bookingId: manifestBooking.id,
        equipmentItemId: BASE_EQUIPMENT[0].id,
        requestedSize: "M",
      },
      {
        bookingId: manifestBooking.id,
        equipmentItemId: BASE_EQUIPMENT[2].id,
        gasType: GasType.NITROX,
        nitroxPercent: 32,
        cylinderVolumeLitres: 12,
        cylinderForm: CylinderForm.STANDARD,
      },
      {
        bookingId: manifestBooking.id,
        equipmentItemId: BASE_EQUIPMENT[3].id,
        requestedWeightKg: 8,
      },
      {
        bookingId: manifestBooking.id,
        equipmentItemId: BASE_EQUIPMENT[5].id,
        shoeSizeUk: 9,
        finStyle: FinStyle.OPEN_HEEL,
      },
    ],
  });

  await prisma.course.upsert({
    where: { id: DEV_COURSE_ID },
    create: {
      id: DEV_COURSE_ID,
      organizationId: DEFAULT_ORGANIZATION_ID,
      name: "SSI Divemaster",
      description:
        "Development course with classroom, pool and open-water sessions.",
      agency: CertAgency.SSI,
      prerequisiteCertLevel: CertLevel.RESCUE_DIVER,
      price: 12000,
      instructorId: admin.id,
    },
    update: {
      instructorId: admin.id,
      name: "SSI Divemaster",
      description:
        "Development course with classroom, pool and open-water sessions.",
      agency: CertAgency.SSI,
      prerequisiteCertLevel: CertLevel.RESCUE_DIVER,
      price: 12000,
    },
  });

  const sessions = [
    {
      id: "61000000-0000-0000-0000-000000000001",
      sessionDate: futureDate(8),
      startTime: "18:00",
      endTime: "20:00",
      locationType: "classroom",
      siteId: null,
    },
    {
      id: "61000000-0000-0000-0000-000000000002",
      sessionDate: futureDate(10),
      startTime: "16:00",
      endTime: "18:00",
      locationType: "pool",
      siteId: null,
    },
    {
      id: "61000000-0000-0000-0000-000000000003",
      sessionDate: futureDate(12),
      startTime: "07:00",
      endTime: "12:00",
      locationType: "open_water",
      siteId: BASE_DIVE_SITES[0].id,
    },
  ];

  for (const session of sessions) {
    await prisma.courseSession.upsert({
      where: { id: session.id },
      create: {
        ...session,
        courseId: DEV_COURSE_ID,
      },
      update: {
        courseId: DEV_COURSE_ID,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        locationType: session.locationType,
        siteId: session.siteId,
      },
    });
  }

  await prisma.courseEnrollment.upsert({
    where: {
      courseId_userId: { courseId: DEV_COURSE_ID, userId: client.id },
    },
    create: {
      courseId: DEV_COURSE_ID,
      userId: client.id,
      status: EnrollmentStatus.ENROLLED,
    },
    update: { status: EnrollmentStatus.ENROLLED },
  });

  await prisma.siteCondition.upsert({
    where: { id: "70000000-0000-0000-0000-000000000001" },
    create: {
      id: "70000000-0000-0000-0000-000000000001",
      organizationId: DEFAULT_ORGANIZATION_ID,
      source: "manual",
      recordedAt: new Date(),
      significantWaveHeightM: 1.2,
      maxWaveHeightM: 1.9,
      meanWavePeriodS: 8,
      windSpeedMps: 6.5,
      windDirectionDeg: 140,
      airTemperatureC: 21,
      airPressureHpa: 1015,
      currentSpeedMps: 0.4,
      currentDirectionDeg: 210,
      seaSurfaceTempC: 22.5,
    },
    update: {
      recordedAt: new Date(),
      significantWaveHeightM: 1.2,
      maxWaveHeightM: 1.9,
      meanWavePeriodS: 8,
      windSpeedMps: 6.5,
      windDirectionDeg: 140,
      airTemperatureC: 21,
      airPressureHpa: 1015,
      currentSpeedMps: 0.4,
      currentDirectionDeg: 210,
      seaSurfaceTempC: 22.5,
    },
  });

  for (const [index, boat] of BASE_BOATS.entries()) {
    for (const dayOfWeek of [0, 6]) {
      const id = `80000000-0000-0000-000${index + 1}-${String(dayOfWeek + 1).padStart(12, "0")}`;
      await prisma.scheduleTemplate.upsert({
        where: { id },
        create: {
          id,
          boatId: boat.id,
          dayOfWeek,
          meetTime: "07:00",
          launchTime: "08:00",
          seasonLabel: "Local development",
          active: true,
        },
        update: {
          boatId: boat.id,
          dayOfWeek,
          meetTime: "07:00",
          launchTime: "08:00",
          seasonLabel: "Local development",
          active: true,
        },
      });
    }
  }

  console.log("Development seed complete.");
  console.log(`Admin login:  ${adminEmail} / ${adminPassword}`);
  console.log(`Client login: ${clientEmail} / ${clientPassword}`);
  console.log("Never use these local development passwords in Railway production.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
