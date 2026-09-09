import { Router } from "express";
import { z } from "zod";
import { AppRole, CertAgency, CertLevel } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import {
  equipmentProfileInputSchema,
  serializeEquipmentProfile,
} from "../lib/equipment";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const safeUserSelect = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  certAgency: true,
  certLevel: true,
  certNumber: true,
  certSpecialties: true,
  mostRecentDiveDate: true,
  mostRecentDiveLoc: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { role: true } },
} as const;

router.get(
  "/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: {
        id: req.auth!.userId,
        organizationId: req.auth!.organizationId,
      },
      select: safeUserSelect,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        ...user,
        name: `${user.firstName} ${user.lastName}`.trim(),
        mostRecentDiveLocation: user.mostRecentDiveLoc,
        roles: user.roles.map((record) => record.role),
      },
    });
  }),
);

router.get(
  "/me/equipment-profile",
  requireAuth,
  asyncRoute(async (req, res) => {
    const profile = await prisma.userEquipmentProfile.findFirst({
      where: {
        userId: req.auth!.userId,
        user: { organizationId: req.auth!.organizationId },
      },
    });

    return res.json({ profile: serializeEquipmentProfile(profile) });
  }),
);

router.put(
  "/me/equipment-profile",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = equipmentProfileInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: req.auth!.userId,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = parsed.data;
    const profile = await prisma.userEquipmentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...data,
      },
      update: data,
    });

    return res.json({ profile: serializeEquipmentProfile(profile) });
  }),
);

const updateCertSchema = z
  .object({
    certAgency: z.nativeEnum(CertAgency).nullable().optional(),
    certLevel: z.nativeEnum(CertLevel).nullable().optional(),
    certNumber: z.string().trim().max(100).nullable().optional(),
    certSpecialties: z
      .array(z.string().trim().min(1).max(100))
      .max(50)
      .optional(),
    mostRecentDiveDate: z.string().datetime().nullable().optional(),
    mostRecentDiveLoc: z.string().trim().max(200).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

router.patch(
  "/me/certification",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = updateCertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;
    const existing = await prisma.user.findFirst({
      where: {
        id: req.auth!.userId,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(data.certAgency !== undefined && { certAgency: data.certAgency }),
        ...(data.certLevel !== undefined && { certLevel: data.certLevel }),
        ...(data.certNumber !== undefined && { certNumber: data.certNumber }),
        ...(data.certSpecialties !== undefined && {
          certSpecialties: data.certSpecialties,
        }),
        ...(data.mostRecentDiveDate !== undefined && {
          mostRecentDiveDate:
            data.mostRecentDiveDate == null
              ? null
              : new Date(data.mostRecentDiveDate),
        }),
        ...(data.mostRecentDiveLoc !== undefined && {
          mostRecentDiveLoc: data.mostRecentDiveLoc,
        }),
      },
      select: safeUserSelect,
    });

    return res.json({
      user: {
        ...updated,
        name: `${updated.firstName} ${updated.lastName}`.trim(),
        mostRecentDiveLocation: updated.mostRecentDiveLoc,
        roles: updated.roles.map((record) => record.role),
      },
    });
  }),
);

// Same "who can create a trip" roles as trips.ts's tripStaffRoles — kept as
// a separate local list rather than importing from trips.ts to avoid a
// route-to-route dependency for one small array.
const tripStaffRoles: AppRole[] = [
  AppRole.ADMIN,
  AppRole.OWNER,
  AppRole.SKIPPER,
  AppRole.DIVEMASTER,
  AppRole.INSTRUCTOR,
];

const listStaffQuerySchema = z
  .object({ role: z.nativeEnum(AppRole).optional() })
  .strict();

// Lists staff members (optionally filtered to one role) for pickers like
// "assign a skipper" when creating a trip — not a general user directory,
// deliberately restricted to the same roles that can create trips.
router.get(
  "/staff",
  requireAuth,
  requireRole(...tripStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = listStaffQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const staff = await prisma.user.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        roles: {
          some: parsed.data.role
            ? { role: parsed.data.role }
            : {
                role: {
                  in: [
                    AppRole.SKIPPER,
                    AppRole.DIVEMASTER,
                    AppRole.INSTRUCTOR,
                    AppRole.ADMIN,
                    AppRole.OWNER,
                  ],
                },
              },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roles: { select: { role: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return res.json({
      staff: staff.map((member) => ({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        roles: member.roles.map((record) => record.role),
      })),
    });
  }),
);

export default router;
