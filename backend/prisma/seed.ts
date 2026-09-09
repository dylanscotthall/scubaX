import dotenv from "dotenv";
dotenv.config();

import {
  AppRole,
  CertLevel,
  EquipmentCategory,
  PrismaClient,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

export const DEFAULT_ORGANIZATION_ID =
  process.env.DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

export const BASE_BOATS = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Blonde Moments",
    capacity: 10,
    active: true,
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Rabbit",
    capacity: 8,
    active: true,
  },
] as const;


export const BASE_LAUNCH_SITES = [
  {
    id: "15000000-0000-0000-0000-000000000001",
    name: "Umkomaas Beach Launch",
    address: "1 Lagoon Drive, Umkomaas, KwaZulu-Natal",
    latitude: -30.2064,
    longitude: 30.7975,
    active: true,
  },
] as const;

export const BASE_DIVE_SITES = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    name: "Raggies Cave",
    description:
      "Caves, overhangs and gullies with seasonal ragged-tooth shark encounters. Maximum depth approximately 18 m.",
    minCertLevel: CertLevel.OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    name: "Inside Edge",
    description:
      "Aliwal Shoal reef edge with changing conditions and pelagic encounters. Approximately 12-24 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000003",
    name: "Outside Edge",
    description:
      "Deeper reef-edge dive with variable conditions. Approximately 20-30 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    name: "Manta Point",
    description:
      "Multilevel reef with swim-throughs and gullies. Maximum depth approximately 16 m.",
    minCertLevel: CertLevel.OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000005",
    name: "Pinnacles",
    description:
      "Shallow pinnacles, gullies, caves and overhangs. Typical depth approximately 6-12 m.",
    minCertLevel: CertLevel.OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000006",
    name: "North Sands",
    description: "Aliwal Shoal sand and reef dive. Maximum depth approximately 18 m.",
    minCertLevel: CertLevel.OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000007",
    name: "South Sands",
    description: "Aliwal Shoal sand and reef dive. Maximum depth approximately 18 m.",
    minCertLevel: CertLevel.OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000008",
    name: "Howards Castle",
    description:
      "Castle-like reef structures with gullies, caves and swim-throughs. Maximum depth approximately 22 m.",
    minCertLevel: CertLevel.OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000009",
    name: "Nebo Wreck",
    description:
      "Historic steamship wreck lying upside down at approximately 28 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000010",
    name: "Produce Wreck",
    description:
      "Large wreck with the bridge near 12 m and the sand bed near 35 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000011",
    name: "Landers",
    description: "Southern reef dive, approximately 21-35 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000012",
    name: "Butchers",
    description: "Southern reef dive, approximately 18-26 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000013",
    name: "Cowrie",
    description: "Southern reef dive, approximately 16-26 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000014",
    name: "Umzimai Wall",
    description: "Deep southern wall dive, approximately 28-40 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
  {
    id: "20000000-0000-0000-0000-000000000015",
    name: "Fern Coral",
    description: "Southern reef dive, approximately 18-26 m.",
    minCertLevel: CertLevel.ADVANCED_OPEN_WATER,
  },
] as const;

export const BASE_EQUIPMENT = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    slug: "bcd",
    name: "BCD",
    category: EquipmentCategory.BCD,
    displayOrder: 10,
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    slug: "regulator",
    name: "Regulator set",
    category: EquipmentCategory.REGULATOR,
    displayOrder: 20,
  },
  {
    id: "30000000-0000-0000-0000-000000000003",
    slug: "cylinder",
    name: "Cylinder",
    category: EquipmentCategory.CYLINDER,
    displayOrder: 30,
  },
  {
    id: "30000000-0000-0000-0000-000000000004",
    slug: "weights",
    name: "Weights",
    category: EquipmentCategory.WEIGHTS,
    displayOrder: 40,
  },
  {
    id: "30000000-0000-0000-0000-000000000005",
    slug: "wetsuit",
    name: "Wetsuit (5 mm)",
    category: EquipmentCategory.WETSUIT,
    displayOrder: 50,
  },
  {
    id: "30000000-0000-0000-0000-000000000006",
    slug: "fins",
    name: "Fins",
    category: EquipmentCategory.FINS,
    displayOrder: 60,
  },
  {
    id: "30000000-0000-0000-0000-000000000007",
    slug: "mask",
    name: "Mask",
    category: EquipmentCategory.MASK,
    displayOrder: 70,
  },
  {
    id: "30000000-0000-0000-0000-000000000008",
    slug: "dive-computer",
    name: "Dive computer",
    category: EquipmentCategory.DIVE_COMPUTER,
    displayOrder: 80,
  },
] as const;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the seed");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

async function ensureAdmin(prisma: PrismaClient): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const resetPassword = process.env.SEED_ADMIN_RESET_PASSWORD === "true";

  if (!email && !password) {
    console.log("Admin seed skipped: SEED_ADMIN_EMAIL is not set.");
    return;
  }
  if (!email) {
    throw new Error("SEED_ADMIN_EMAIL is required when SEED_ADMIN_PASSWORD is set");
  }
  if (password != null && password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters");
  }
  if (resetPassword && !password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required when SEED_ADMIN_RESET_PASSWORD=true",
    );
  }

  const firstName = process.env.SEED_ADMIN_FIRST_NAME?.trim() || "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME?.trim() || "User";
  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  if (!existing) {
    if (!password) {
      throw new Error(
        `Admin user ${email} does not exist. Set SEED_ADMIN_PASSWORD for the first seed run.`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        email,
        passwordHash,
        firstName,
        lastName,
        certSpecialties: [],
      },
      select: { id: true },
    });
    userId = user.id;
    console.log(`Created admin user: ${email}`);
  } else {
    userId = existing.id;
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        firstName,
        lastName,
        ...(resetPassword && password
          ? { passwordHash: await bcrypt.hash(password, 12) }
          : {}),
      },
    });
    console.log(
      `Admin user already exists: ${email}${
        resetPassword ? " (password reset requested)" : " (password unchanged)"
      }`,
    );
  }

  for (const role of [
    AppRole.CLIENT,
    AppRole.ADMIN,
    AppRole.OWNER,
    AppRole.INSTRUCTOR,
    AppRole.SKIPPER,
    AppRole.DIVEMASTER,
  ]) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role },
      update: {},
    });
  }
}

export async function seedBase(prisma: PrismaClient): Promise<void> {
  const organizationName =
    process.env.ORGANIZATION_NAME?.trim() || "ScubaXcursions";

  await prisma.organization.upsert({
    where: { id: DEFAULT_ORGANIZATION_ID },
    create: { id: DEFAULT_ORGANIZATION_ID, name: organizationName },
    update: { name: organizationName },
  });

  for (const item of BASE_EQUIPMENT) {
    await prisma.equipmentItem.upsert({
      where: {
        organizationId_slug: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          slug: item.slug,
        },
      },
      create: {
        id: item.id,
        organizationId: DEFAULT_ORGANIZATION_ID,
        slug: item.slug,
        name: item.name,
        category: item.category,
        displayOrder: item.displayOrder,
        active: true,
      },
      update: {
        name: item.name,
        category: item.category,
        displayOrder: item.displayOrder,
      },
    });
  }

  for (const boat of BASE_BOATS) {
    await prisma.boat.upsert({
      where: { id: boat.id },
      create: {
        ...boat,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
      update: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: boat.name,
        capacity: boat.capacity,
      },
    });
  }

  for (const launchSite of BASE_LAUNCH_SITES) {
    await prisma.launchSite.upsert({
      where: {
        organizationId_name: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          name: launchSite.name,
        },
      },
      create: {
        ...launchSite,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
      update: {
        address: launchSite.address,
        latitude: launchSite.latitude,
        longitude: launchSite.longitude,
      },
    });
  }

  for (const site of BASE_DIVE_SITES) {
    await prisma.diveSite.upsert({
      where: { id: site.id },
      create: {
        ...site,
        organizationId: DEFAULT_ORGANIZATION_ID,
        active: true,
      },
      update: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: site.name,
        description: site.description,
        minCertLevel: site.minCertLevel,
      },
    });
  }

  await ensureAdmin(prisma);

  console.log(
    `Base seed complete: organization, ${BASE_EQUIPMENT.length} equipment items, ${BASE_BOATS.length} boats, ${BASE_LAUNCH_SITES.length} launch site, and ${BASE_DIVE_SITES.length} dive sites.`,
  );
}

async function main() {
  const prisma = createPrismaClient();
  try {
    await seedBase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
