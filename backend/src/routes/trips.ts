import { Router } from "express";
import { z } from "zod";
import {
  AppRole,
  BookingStatus,
  EquipmentCategory,
  GasType,
  Prisma,
  TripStatus,
  WaitlistStatus,
} from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute, HttpError } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { notifySiteFollowers, notifyTripCancelled } from "../lib/notify";
import { clientBookingCapacity } from "../lib/capacity";

const router = Router();

const tripStaffRoles: AppRole[] = [
  AppRole.ADMIN,
  AppRole.OWNER,
  AppRole.SKIPPER,
  AppRole.DIVEMASTER,
  AppRole.INSTRUCTOR,
];
const manifestRoles: AppRole[] = [...tripStaffRoles];

const tripPublicInclude = {
  boat: {
    select: { id: true, name: true, capacity: true, active: true },
  },
  launchSite: {
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      active: true,
    },
  },
  site: {
    select: {
      id: true,
      name: true,
      active: true,
      closedReason: true,
      minCertLevel: true,
    },
  },
  _count: {
    select: {
      bookings: { where: { status: BookingStatus.CONFIRMED } },
    },
  },
} as const;

type PublicTrip = Prisma.TripGetPayload<{ include: typeof tripPublicInclude }>;

function serializeTrip(trip: PublicTrip) {
  const boatCapacity = trip.capacityOverride ?? trip.boat.capacity;
  const capacity = clientBookingCapacity(boatCapacity);
  return {
    id: trip.id,
    date: trip.tripDate.toISOString().slice(0, 10),
    tripDate: trip.tripDate,
    meetTime: trip.meetTime,
    launchTime: trip.launchTime,
    siteEstimated: trip.siteEstimated,
    capacityOverride: trip.capacityOverride,
    capacity,
    boatCapacity,
    status: trip.status,
    cancelledAt: trip.cancelledAt,
    cancelledReason: trip.cancelledReason,
    boat: trip.boat,
    launchSite: trip.launchSite,
    site: trip.site,
    confirmedCount: trip._count.bookings,
    spotsTaken: trip._count.bookings,
  };
}

function parseDate(value: string, endOfDay = false): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(
    dateOnly
      ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
      : value,
  );
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `Invalid date value: ${value}`);
  }
  return parsed;
}

const listTripsQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    boatId: z.string().guid().optional(),
    status: z.nativeEnum(TripStatus).optional(),
  })
  .strict();

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = listTripsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { from, to, boatId, status } = parsed.data;
    const trips = await prisma.trip.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        ...(boatId && { boatId }),
        ...(status && { status }),
        ...(from || to
          ? {
              tripDate: {
                ...(from && { gte: parseDate(from) }),
                ...(to && { lte: parseDate(to, true) }),
              },
            }
          : {}),
      },
      include: tripPublicInclude,
      orderBy: [{ tripDate: "asc" }, { launchTime: "asc" }],
    });

    return res.json({ trips: trips.map(serializeTrip) });
  }),
);

const manifestQuerySchema = z
  .object({
    category: z.nativeEnum(EquipmentCategory).optional(),
    size: z.string().trim().min(1).max(20).optional(),
    gasType: z.nativeEnum(GasType).optional(),
  })
  .strict();

router.get(
  "/:tripId/equipment-requests",
  requireAuth,
  requireRole(...manifestRoles),
  asyncRoute(async (req, res) => {
    const query = manifestQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: query.error.flatten() });
    }

    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.tripId,
        organizationId: req.auth!.organizationId,
      },
      select: {
        id: true,
        tripDate: true,
        meetTime: true,
        launchTime: true,
        boat: { select: { id: true, name: true } },
        launchSite: { select: { id: true, name: true, address: true } },
        site: { select: { id: true, name: true } },
      },
    });
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        tripId: trip.id,
        status: BookingStatus.CONFIRMED,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        equipmentRequests: {
          select: {
            id: true,
            quantity: true,
            requestedSize: true,
            gasType: true,
            nitroxPercent: true,
            cylinderVolumeLitres: true,
            cylinderForm: true,
            requestedWeightKg: true,
            shoeSizeUk: true,
            finStyle: true,
            clientNote: true,
            equipmentItem: {
              select: {
                id: true,
                slug: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { bookedAt: "asc" },
    });

    const normalizedSize = query.data.size?.toUpperCase();
    const requests = bookings
      .flatMap((booking) =>
        booking.equipmentRequests.map((request) => ({
          id: request.id,
          bookingId: booking.id,
          client: {
            ...booking.user,
            name: `${booking.user.firstName} ${booking.user.lastName}`.trim(),
          },
          equipmentItem: request.equipmentItem,
          quantity: request.quantity,
          requestedSize: request.requestedSize,
          gasType: request.gasType,
          nitroxPercent: request.nitroxPercent,
          cylinderVolumeLitres: request.cylinderVolumeLitres,
          cylinderForm: request.cylinderForm,
          requestedWeightKg:
            request.requestedWeightKg == null
              ? null
              : Number(request.requestedWeightKg),
          shoeSizeUk:
            request.shoeSizeUk == null ? null : Number(request.shoeSizeUk),
          finStyle: request.finStyle,
          clientNote: request.clientNote,
        })),
      )
      .filter((request) => {
        if (
          query.data.category &&
          request.equipmentItem.category !== query.data.category
        ) {
          return false;
        }
        if (
          normalizedSize &&
          request.requestedSize?.toUpperCase() !== normalizedSize
        ) {
          return false;
        }
        if (query.data.gasType && request.gasType !== query.data.gasType) {
          return false;
        }
        return true;
      });

    const summary = {
      byCategory: {} as Record<string, number>,
      bcdSizes: {} as Record<string, number>,
      wetsuitSizes: {} as Record<string, number>,
      cylinders: {} as Record<string, number>,
      totalWeightKg: 0,
      fins: {} as Record<string, number>,
    };

    for (const request of requests) {
      const quantity = request.quantity;
      const category = request.equipmentItem.category;
      summary.byCategory[category] =
        (summary.byCategory[category] ?? 0) + quantity;

      if (category === EquipmentCategory.BCD && request.requestedSize) {
        summary.bcdSizes[request.requestedSize] =
          (summary.bcdSizes[request.requestedSize] ?? 0) + quantity;
      }
      if (category === EquipmentCategory.WETSUIT && request.requestedSize) {
        summary.wetsuitSizes[request.requestedSize] =
          (summary.wetsuitSizes[request.requestedSize] ?? 0) + quantity;
      }
      if (
        category === EquipmentCategory.CYLINDER &&
        request.cylinderVolumeLitres &&
        request.gasType &&
        request.cylinderForm
      ) {
        const key = `${request.cylinderVolumeLitres}L ${request.cylinderForm} ${request.gasType}${
          request.gasType === GasType.NITROX && request.nitroxPercent
            ? ` ${request.nitroxPercent}%`
            : ""
        }`;
        summary.cylinders[key] = (summary.cylinders[key] ?? 0) + quantity;
      }
      if (
        category === EquipmentCategory.WEIGHTS &&
        request.requestedWeightKg != null
      ) {
        summary.totalWeightKg += request.requestedWeightKg;
      }
      if (
        category === EquipmentCategory.FINS &&
        request.shoeSizeUk != null &&
        request.finStyle
      ) {
        const key = `UK ${request.shoeSizeUk} ${request.finStyle}`;
        summary.fins[key] = (summary.fins[key] ?? 0) + quantity;
      }
    }

    summary.totalWeightKg = Number(summary.totalWeightKg.toFixed(1));

    return res.json({
      trip: {
        ...trip,
        date: trip.tripDate.toISOString().slice(0, 10),
      },
      filters: query.data,
      summary,
      requests,
    });
  }),
);

router.get(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      include: tripPublicInclude,
    });
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    return res.json({ trip: serializeTrip(trip) });
  }),
);

const createTripSchema = z
  .object({
    boatId: z.string().guid(),
    launchSiteId: z.string().guid().nullable().optional(),
    siteId: z.string().guid().nullable().optional(),
    siteEstimated: z.boolean().optional(),
    tripDate: z.iso.date(),
    meetTime: z.iso.time({ precision: -1 }),
    launchTime: z.iso.time({ precision: -1 }),
    capacityOverride: z
      .number()
      .int()
      .positive()
      .max(100)
      .nullable()
      .optional(),
    skipperId: z.string().guid().nullable().optional(),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(...tripStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;
    const organizationId = req.auth!.organizationId;

    const boat = await prisma.boat.findFirst({
      where: { id: data.boatId, organizationId, active: true },
      select: { id: true },
    });
    if (!boat) {
      return res.status(400).json({ error: "Boat not found or inactive" });
    }

    if (data.launchSiteId) {
      const launchSite = await prisma.launchSite.findFirst({
        where: { id: data.launchSiteId, organizationId, active: true },
        select: { id: true },
      });
      if (!launchSite) {
        return res
          .status(400)
          .json({ error: "Launch site not found or inactive" });
      }
    }

    if (data.siteId) {
      const site = await prisma.diveSite.findFirst({
        where: { id: data.siteId, organizationId, active: true },
        select: { id: true },
      });
      if (!site) {
        return res
          .status(400)
          .json({ error: "Dive site not found or inactive" });
      }
    }

    if (data.skipperId) {
      const skipper = await prisma.user.findFirst({
        where: {
          id: data.skipperId,
          organizationId,
          roles: { some: { role: AppRole.SKIPPER } },
        },
        select: { id: true },
      });
      if (!skipper) {
        return res
          .status(400)
          .json({ error: "Skipper not found in this organization" });
      }
    }

    const trip = await prisma.trip.create({
      data: {
        organizationId,
        boatId: data.boatId,
        launchSiteId: data.launchSiteId ?? null,
        siteId: data.siteId ?? null,
        siteEstimated: data.siteEstimated ?? !data.siteId,
        tripDate: new Date(`${data.tripDate}T00:00:00.000Z`),
        meetTime: data.meetTime,
        launchTime: data.launchTime,
        capacityOverride: data.capacityOverride ?? null,
        skipperId: data.skipperId ?? null,
        createdById: req.auth!.userId,
      },
      include: tripPublicInclude,
    });

    if (trip.siteId) {
      await notifySiteFollowers(trip.organizationId, trip.siteId, trip.id);
    }

    return res.status(201).json({ trip: serializeTrip(trip) });
  }),
);

const cancelTripSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();

router.post(
  "/:id/cancel",
  requireAuth,
  requireRole(...tripStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = cancelTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.trip.findFirst({
          where: {
            id: req.params.id,
            organizationId: req.auth!.organizationId,
          },
          select: { id: true, status: true },
        });
        if (!existing) throw new HttpError(404, "Trip not found");
        if (existing.status === TripStatus.CANCELLED) {
          throw new HttpError(409, "Trip is already cancelled");
        }

        const updatedTrip = await tx.trip.update({
          where: { id: existing.id },
          data: {
            status: TripStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledReason: parsed.data.reason,
            cancelledById: req.auth!.userId,
          },
        });

        const bookings = await tx.booking.findMany({
          where: { tripId: existing.id, status: BookingStatus.CONFIRMED },
          select: { id: true, userId: true },
        });

        if (bookings.length > 0) {
          await tx.booking.updateMany({
            where: { id: { in: bookings.map((booking) => booking.id) } },
            data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
          });
        }

        await tx.tripWaitlistEntry.updateMany({
          where: {
            tripId: existing.id,
            status: { in: [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED] },
          },
          data: { status: WaitlistStatus.EXPIRED, resolvedAt: new Date() },
        });

        return {
          trip: updatedTrip,
          affectedUserIds: bookings.map((booking) => booking.userId),
        };
      });

      await notifyTripCancelled(result.trip.id, result.affectedUserIds);
      return res.json({ trip: result.trip });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      throw error;
    }
  }),
);

export default router;
