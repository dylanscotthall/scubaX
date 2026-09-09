import { Router } from "express";
import { z } from "zod";
import { AppRole } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const WAIVER_WINDOW_HOURS = 24;

const createWaiverSchema = z
  .object({
    version: z.string().trim().min(1).max(100),
    content: z.string().trim().min(1),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(AppRole.ADMIN, AppRole.OWNER),
  asyncRoute(async (req, res) => {
    const parsed = createWaiverSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const waiver = await prisma.$transaction(async (tx) => {
      await tx.waiver.updateMany({
        where: {
          organizationId: req.auth!.organizationId,
          active: true,
        },
        data: { active: false },
      });

      return tx.waiver.create({
        data: {
          organizationId: req.auth!.organizationId,
          ...parsed.data,
        },
      });
    });

    return res.status(201).json({ waiver });
  }),
);

router.get(
  "/status/:tripId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.tripId,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true, tripDate: true },
    });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const waiver = await prisma.waiver.findFirst({
      where: {
        organizationId: req.auth!.organizationId,
        active: true,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!waiver) {
      return res.status(404).json({ error: "No active waiver configured" });
    }

    const availableFrom = new Date(
      trip.tripDate.getTime() - WAIVER_WINDOW_HOURS * 60 * 60 * 1000,
    );
    const existingSignature = await prisma.waiverSignature.findUnique({
      where: {
        tripId_userId: { tripId: trip.id, userId: req.auth!.userId },
      },
    });

    return res.json({
      waiverId: waiver.id,
      version: waiver.version,
      availableFrom,
      isAvailableNow: new Date() >= availableFrom,
      signed: Boolean(existingSignature?.signedAt),
    });
  }),
);

router.post(
  "/sign/:tripId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.tripId,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true, tripDate: true },
    });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const booking = await prisma.booking.findFirst({
      where: {
        tripId: trip.id,
        userId: req.auth!.userId,
        status: "CONFIRMED",
      },
      select: { id: true },
    });
    if (!booking) {
      return res.status(403).json({ error: "Only booked clients may sign this trip waiver" });
    }

    const waiver = await prisma.waiver.findFirst({
      where: {
        organizationId: req.auth!.organizationId,
        active: true,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!waiver) {
      return res.status(404).json({ error: "No active waiver configured" });
    }

    const availableFrom = new Date(
      trip.tripDate.getTime() - WAIVER_WINDOW_HOURS * 60 * 60 * 1000,
    );
    if (new Date() < availableFrom) {
      return res.status(403).json({
        error: `This waiver becomes available at ${availableFrom.toISOString()}`,
      });
    }

    const signature = await prisma.waiverSignature.upsert({
      where: {
        tripId_userId: { tripId: trip.id, userId: req.auth!.userId },
      },
      create: {
        waiverId: waiver.id,
        userId: req.auth!.userId,
        tripId: trip.id,
        availableFrom,
        signedAt: new Date(),
      },
      update: {
        waiverId: waiver.id,
        availableFrom,
        signedAt: new Date(),
      },
    });

    return res.json({ signature });
  }),
);

export default router;
