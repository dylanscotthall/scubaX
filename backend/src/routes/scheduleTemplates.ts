import { Router } from "express";
import { z } from "zod";
import { AppRole } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const adminRoles = [AppRole.ADMIN, AppRole.OWNER];

async function findBoatInOrg(boatId: string, organizationId: string) {
  return prisma.boat.findFirst({ where: { id: boatId, organizationId } });
}

router.get(
  "/boats/:boatId/schedule-templates",
  requireAuth,
  asyncRoute(async (req, res) => {
    const boat = await findBoatInOrg(req.params.boatId, req.auth!.organizationId);
    if (!boat) return res.status(404).json({ error: "Boat not found" });

    const scheduleTemplates = await prisma.scheduleTemplate.findMany({
      where: { boatId: boat.id },
      orderBy: [{ dayOfWeek: "asc" }, { meetTime: "asc" }],
    });
    return res.json({ scheduleTemplates });
  }),
);

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected 24h HH:MM, e.g. 07:00");

const createTemplateSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    meetTime: timeString,
    launchTime: timeString,
    seasonLabel: z.string().trim().max(100).nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict();

router.post(
  "/boats/:boatId/schedule-templates",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const boat = await findBoatInOrg(req.params.boatId, req.auth!.organizationId);
    if (!boat) return res.status(404).json({ error: "Boat not found" });

    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const scheduleTemplate = await prisma.scheduleTemplate.create({
      data: { boatId: boat.id, ...parsed.data },
    });
    return res.status(201).json({ scheduleTemplate });
  }),
);

const updateTemplateSchema = createTemplateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

router.patch(
  "/schedule-templates/:id",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.scheduleTemplate.findUnique({
      where: { id: req.params.id },
      include: { boat: { select: { organizationId: true } } },
    });
    if (!existing || existing.boat.organizationId !== req.auth!.organizationId) {
      return res.status(404).json({ error: "Schedule template not found" });
    }

    const scheduleTemplate = await prisma.scheduleTemplate.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return res.json({ scheduleTemplate });
  }),
);

router.delete(
  "/schedule-templates/:id",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const existing = await prisma.scheduleTemplate.findUnique({
      where: { id: req.params.id },
      include: { boat: { select: { organizationId: true } } },
    });
    if (!existing || existing.boat.organizationId !== req.auth!.organizationId) {
      return res.status(404).json({ error: "Schedule template not found" });
    }

    await prisma.scheduleTemplate.delete({ where: { id: existing.id } });
    return res.status(204).send();
  }),
);

export default router;
