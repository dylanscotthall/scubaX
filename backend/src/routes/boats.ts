import { Router } from "express";
import { z } from "zod";
import { AppRole } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const adminRoles = [AppRole.ADMIN, AppRole.OWNER];

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const boats = await prisma.boat.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { name: "asc" },
    });
    return res.json({ boats });
  }),
);

const createBoatSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    capacity: z.number().int().positive().max(100).default(10),
    active: z.boolean().default(true),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const parsed = createBoatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const boat = await prisma.boat.create({
      data: {
        organizationId: req.auth!.organizationId,
        ...parsed.data,
      },
    });

    return res.status(201).json({ boat });
  }),
);

const updateBoatSchema = createBoatSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

router.patch(
  "/:id",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const parsed = updateBoatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.boat.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Boat not found" });
    }

    const boat = await prisma.boat.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    return res.json({ boat });
  }),
);

export default router;
