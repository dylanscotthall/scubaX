import { Router } from "express";
import { z } from "zod";
import { AppRole, Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const staffRoles: readonly AppRole[] = [AppRole.ADMIN, AppRole.OWNER];

const launchSiteSelect = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LaunchSiteSelect;

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const includeInactive =
      req.query.includeInactive === "true" &&
      req.auth!.roles.some((role) => staffRoles.includes(role));

    const launchSites = await prisma.launchSite.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        ...(includeInactive ? {} : { active: true }),
      },
      select: launchSiteSelect,
      orderBy: { name: "asc" },
    });

    return res.json({ launchSites });
  }),
);

const launchSiteInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().max(300).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(...staffRoles),
  asyncRoute(async (req, res) => {
    const parsed = launchSiteInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const launchSite = await prisma.launchSite.create({
        data: {
          organizationId: req.auth!.organizationId,
          name: parsed.data.name,
          address: parsed.data.address ?? null,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          active: parsed.data.active ?? true,
        },
        select: launchSiteSelect,
      });
      return res.status(201).json({ launchSite });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res
          .status(409)
          .json({ error: "A launch site with that name already exists" });
      }
      throw error;
    }
  }),
);

const updateLaunchSiteSchema = launchSiteInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

router.patch(
  "/:id",
  requireAuth,
  requireRole(...staffRoles),
  asyncRoute(async (req, res) => {
    const parsed = updateLaunchSiteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.launchSite.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Launch site not found" });
    }

    try {
      const launchSite = await prisma.launchSite.update({
        where: { id: existing.id },
        data: parsed.data,
        select: launchSiteSelect,
      });
      return res.json({ launchSite });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res
          .status(409)
          .json({ error: "A launch site with that name already exists" });
      }
      throw error;
    }
  }),
);

export default router;
