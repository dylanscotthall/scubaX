import { Router } from "express";
import { z } from "zod";
import { AppRole } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { syncSappiBuoy } from "../services/sappiBuoy";

const router = Router();

router.get(
  "/latest",
  requireAuth,
  asyncRoute(async (req, res) => {
    const siteCondition = await prisma.siteCondition.findFirst({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { recordedAt: "desc" },
    });
    return res.json({ siteCondition });
  }),
);

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const limit = Math.min(
      Math.max(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 1),
      200,
    );
    const siteConditions = await prisma.siteCondition.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
    return res.json({ siteConditions });
  }),
);

const createConditionSchema = z
  .object({
    source: z.enum(["placeholder", "sappi_buoy", "manual"]).default("manual"),
    recordedAt: z.string().datetime().optional(),
    significantWaveHeightM: z.number().nonnegative().optional(),
    maxWaveHeightM: z.number().nonnegative().optional(),
    meanWavePeriodS: z.number().nonnegative().optional(),
    windSpeedMps: z.number().nonnegative().optional(),
    windDirectionDeg: z.number().int().min(0).max(359).optional(),
    airTemperatureC: z.number().optional(),
    airPressureHpa: z.number().positive().optional(),
    meanCurrentSpeedMps: z.number().nonnegative().optional(),
    surfaceCurrentSpeedMps: z.number().nonnegative().optional(),
    currentDirectionDeg: z.number().int().min(0).max(359).optional(),
    seaSurfaceTempC: z.number().optional(),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(AppRole.ADMIN, AppRole.OWNER),
  asyncRoute(async (req, res) => {
    const parsed = createConditionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { recordedAt, ...rest } = parsed.data;
    const siteCondition = await prisma.siteCondition.create({
      data: {
        organizationId: req.auth!.organizationId,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        ...rest,
      },
    });
    return res.status(201).json({ siteCondition });
  }),
);

export default router;
