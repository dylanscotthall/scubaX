import { Router } from "express";
import { z } from "zod";
import { AppRole, CertLevel } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const siteStaffRoles = [
  AppRole.ADMIN,
  AppRole.OWNER,
  AppRole.DIVEMASTER,
  AppRole.INSTRUCTOR,
];

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const sites = await prisma.diveSite.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { name: "asc" },
    });
    return res.json({ sites });
  }),
);

const createSiteSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    minCertLevel: z.nativeEnum(CertLevel).nullable().optional(),
    active: z.boolean().default(true),
    closedReason: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(...siteStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = createSiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const site = await prisma.diveSite.create({
      data: {
        organizationId: req.auth!.organizationId,
        ...parsed.data,
      },
    });

    return res.status(201).json({ site });
  }),
);

const updateSiteSchema = createSiteSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

router.patch(
  "/:id",
  requireAuth,
  requireRole(...siteStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = updateSiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.diveSite.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Dive site not found" });
    }

    const site = await prisma.diveSite.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    return res.json({ site });
  }),
);

router.post(
  "/:id/follow",
  requireAuth,
  asyncRoute(async (req, res) => {
    const site = await prisma.diveSite.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
        active: true,
      },
      select: { id: true },
    });
    if (!site) {
      return res.status(404).json({ error: "Active dive site not found" });
    }

    const follow = await prisma.siteFollow.upsert({
      where: {
        userId_siteId: { userId: req.auth!.userId, siteId: site.id },
      },
      create: { userId: req.auth!.userId, siteId: site.id },
      update: {},
    });
    return res.status(201).json({ follow });
  }),
);

router.delete(
  "/:id/follow",
  requireAuth,
  asyncRoute(async (req, res) => {
    const site = await prisma.diveSite.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!site) {
      return res.status(404).json({ error: "Dive site not found" });
    }

    await prisma.siteFollow.deleteMany({
      where: { userId: req.auth!.userId, siteId: site.id },
    });
    return res.status(204).send();
  }),
);

export default router;
