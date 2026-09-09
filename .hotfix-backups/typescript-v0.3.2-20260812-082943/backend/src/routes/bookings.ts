import { Router } from "express";
import { z } from "zod";
import {
  AppRole,
  BookingStatus,
  Prisma,
  TripStatus,
  WaitlistStatus,
} from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute, HttpError } from "../lib/http";
import {
  equipmentRequestListSchema,
  prepareEquipmentRequestRows,
  serializeEquipmentRequest,
} from "../lib/equipment";
import { serializableTransaction } from "../lib/transactions";
import { clientBookingCapacity } from "../lib/capacity";
import { requireAuth } from "../middleware/auth";
import { notifyWaitlistSpotOpen } from "../lib/notify";

const router = Router();

const createBookingSchema = z
  .object({
    tripId: z.string().uuid(),
    equipment: equipmentRequestListSchema,
  })
  .strict();

const replaceEquipmentSchema = z
  .object({
    equipment: equipmentRequestListSchema,
  })
  .strict();

const bookingRequestInclude = {
  equipmentRequests: {
    include: {
      equipmentItem: {
        select: { id: true, slug: true, name: true, category: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function serializeBooking(booking: {
  id: string;
  tripId: string;
  userId: string;
  status: BookingStatus;
  bookedAt: Date;
  cancelledAt: Date | null;
  equipmentRequests: Parameters<typeof serializeEquipmentRequest>[0][];
}) {
  return {
    id: booking.id,
    tripId: booking.tripId,
    userId: booking.userId,
    status: booking.status,
    bookedAt: booking.bookedAt,
    cancelledAt: booking.cancelledAt,
    equipmentRequests: booking.equipmentRequests.map(serializeEquipmentRequest),
  };
}

function isBookingStaff(roles: AppRole[]): boolean {
  return roles.some((role) =>
    [
      AppRole.ADMIN,
      AppRole.OWNER,
      AppRole.DIVEMASTER,
      AppRole.SKIPPER,
      AppRole.INSTRUCTOR,
    ].includes(role),
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

router.get(
  "/trip/:tripId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const trip = await prisma.trip.findFirst({
      where: {
        id: req.params.tripId,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const [booking, waitlistEntry] = await Promise.all([
      prisma.booking.findUnique({
        where: {
          tripId_userId: {
            tripId: trip.id,
            userId: req.auth!.userId,
          },
        },
        include: bookingRequestInclude,
      }),
      prisma.tripWaitlistEntry.findUnique({
        where: {
          tripId_userId: {
            tripId: trip.id,
            userId: req.auth!.userId,
          },
        },
        select: {
          id: true,
          status: true,
          joinedAt: true,
          notifiedAt: true,
          resolvedAt: true,
        },
      }),
    ]);

    return res.json({
      booking: booking ? serializeBooking(booking) : null,
      waitlistEntry,
    });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { tripId, equipment } = parsed.data;
    const userId = req.auth!.userId;
    const organizationId = req.auth!.organizationId;

    try {
      const booking = await serializableTransaction(async (tx) => {
        const trip = await tx.trip.findFirst({
          where: { id: tripId, organizationId },
          include: {
            boat: { select: { capacity: true } },
            _count: {
              select: {
                bookings: { where: { status: BookingStatus.CONFIRMED } },
              },
            },
          },
        });

        if (!trip) throw new HttpError(404, "Trip not found");
        if (trip.status !== TripStatus.SCHEDULED) {
          throw new HttpError(400, "This trip is not open for booking");
        }

        const existingBooking = await tx.booking.findUnique({
          where: { tripId_userId: { tripId, userId } },
          select: { id: true, status: true },
        });
        if (existingBooking?.status === BookingStatus.CONFIRMED) {
          throw new HttpError(409, "You already have a booking on this trip");
        }

        const capacity = clientBookingCapacity(
          trip.capacityOverride ?? trip.boat.capacity,
        );
        if (trip._count.bookings >= capacity) {
          throw new HttpError(409, "This trip is full. Join the waitlist instead.");
        }

        const created = existingBooking
          ? await tx.booking.update({
              where: { id: existingBooking.id },
              data: {
                status: BookingStatus.CONFIRMED,
                cancelledAt: null,
                bookedAt: new Date(),
              },
            })
          : await tx.booking.create({
              data: {
                tripId,
                userId,
                status: BookingStatus.CONFIRMED,
              },
            });

        // A reactivated booking gets a fresh request snapshot rather than
        // carrying forward equipment from the cancelled booking.
        await tx.bookingEquipmentRequest.deleteMany({
          where: { bookingId: created.id },
        });

        const requestRows = await prepareEquipmentRequestRows(
          tx,
          organizationId,
          created.id,
          equipment,
        );
        if (requestRows.length > 0) {
          await tx.bookingEquipmentRequest.createMany({ data: requestRows });
        }

        await tx.tripWaitlistEntry.updateMany({
          where: {
            tripId,
            userId,
            status: { in: [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED] },
          },
          data: { status: WaitlistStatus.CLAIMED, resolvedAt: new Date() },
        });

        // Only close competing notifications when this booking takes the last
        // available client place. If more places remain, other notified users
        // must still be able to claim them.
        if (trip._count.bookings + 1 >= capacity) {
          await tx.tripWaitlistEntry.updateMany({
            where: {
              tripId,
              status: WaitlistStatus.NOTIFIED,
              userId: { not: userId },
            },
            data: { status: WaitlistStatus.EXPIRED, resolvedAt: new Date() },
          });
        }

        return tx.booking.findUniqueOrThrow({
          where: { id: created.id },
          include: bookingRequestInclude,
        });
      });

      return res.status(201).json({ booking: serializeBooking(booking) });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (isUniqueConstraintError(error)) {
        return res.status(409).json({ error: "You already have a booking on this trip" });
      }
      throw error;
    }
  }),
);

router.put(
  "/:bookingId/equipment",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = replaceEquipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const organizationId = req.auth!.organizationId;
    const userId = req.auth!.userId;
    const allowAnyUser = isBookingStaff(req.auth!.roles);

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const existing = await tx.booking.findFirst({
          where: {
            id: req.params.bookingId,
            status: BookingStatus.CONFIRMED,
            trip: { organizationId },
            ...(allowAnyUser ? {} : { userId }),
          },
          select: { id: true },
        });

        if (!existing) {
          throw new HttpError(404, "Active booking not found");
        }

        const requestRows = await prepareEquipmentRequestRows(
          tx,
          organizationId,
          existing.id,
          parsed.data.equipment,
        );

        await tx.bookingEquipmentRequest.deleteMany({
          where: { bookingId: existing.id },
        });
        if (requestRows.length > 0) {
          await tx.bookingEquipmentRequest.createMany({ data: requestRows });
        }

        return tx.booking.findUniqueOrThrow({
          where: { id: existing.id },
          include: bookingRequestInclude,
        });
      });

      return res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      throw error;
    }
  }),
);

router.post(
  "/:tripId/cancel",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.auth!.userId;
    const tripId = req.params.tripId;

    const booking = await prisma.booking.findFirst({
      where: {
        tripId,
        userId,
        status: BookingStatus.CONFIRMED,
        trip: { organizationId: req.auth!.organizationId },
      },
      select: { id: true },
    });
    if (!booking) {
      return res.status(404).json({ error: "No active booking found for this trip" });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });

    await notifyWaitlistSpotOpen(tripId);
    return res.status(204).send();
  }),
);

router.post(
  "/:tripId/waitlist",
  requireAuth,
  asyncRoute(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.auth!.userId;

    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        organizationId: req.auth!.organizationId,
        status: TripStatus.SCHEDULED,
      },
      include: {
        boat: { select: { capacity: true } },
        _count: {
          select: {
            bookings: { where: { status: BookingStatus.CONFIRMED } },
          },
        },
      },
    });
    if (!trip) {
      return res.status(404).json({ error: "Scheduled trip not found" });
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: { status: true },
    });
    if (existingBooking?.status === BookingStatus.CONFIRMED) {
      return res.status(409).json({ error: "You are already booked on this trip" });
    }

    const capacity = clientBookingCapacity(
      trip.capacityOverride ?? trip.boat.capacity,
    );
    if (trip._count.bookings < capacity) {
      return res.status(409).json({ error: "This trip still has an open spot; book it directly" });
    }

    const entry = await prisma.tripWaitlistEntry.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId },
      update: {
        status: WaitlistStatus.WAITING,
        joinedAt: new Date(),
        notifiedAt: null,
        resolvedAt: null,
      },
    });

    return res.status(201).json({ entry });
  }),
);

router.post(
  "/:tripId/waitlist/claim",
  requireAuth,
  asyncRoute(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.auth!.userId;
    const organizationId = req.auth!.organizationId;

    try {
      const booking = await serializableTransaction(async (tx) => {
        const trip = await tx.trip.findFirst({
          where: {
            id: tripId,
            organizationId,
            status: TripStatus.SCHEDULED,
          },
          include: {
            boat: { select: { capacity: true } },
            _count: {
              select: {
                bookings: { where: { status: BookingStatus.CONFIRMED } },
              },
            },
          },
        });
        if (!trip) throw new HttpError(404, "Scheduled trip not found");

        const existingBooking = await tx.booking.findUnique({
          where: { tripId_userId: { tripId, userId } },
          select: { id: true, status: true },
        });
        if (existingBooking?.status === BookingStatus.CONFIRMED) {
          throw new HttpError(409, "You already have a booking on this trip");
        }

        const capacity = clientBookingCapacity(
          trip.capacityOverride ?? trip.boat.capacity,
        );
        if (trip._count.bookings >= capacity) {
          throw new HttpError(409, "Too late — someone else already claimed this spot");
        }

        const waitlistEntry = await tx.tripWaitlistEntry.findUnique({
          where: { tripId_userId: { tripId, userId } },
        });
        if (
          !waitlistEntry ||
          ![WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED].includes(
            waitlistEntry.status,
          )
        ) {
          throw new HttpError(400, "You are not on the active waitlist for this trip");
        }

        const created = existingBooking
          ? await tx.booking.update({
              where: { id: existingBooking.id },
              data: {
                status: BookingStatus.CONFIRMED,
                cancelledAt: null,
                bookedAt: new Date(),
              },
            })
          : await tx.booking.create({
              data: { tripId, userId, status: BookingStatus.CONFIRMED },
            });

        await tx.bookingEquipmentRequest.deleteMany({
          where: { bookingId: created.id },
        });

        await tx.tripWaitlistEntry.update({
          where: { id: waitlistEntry.id },
          data: { status: WaitlistStatus.CLAIMED, resolvedAt: new Date() },
        });

        if (trip._count.bookings + 1 >= capacity) {
          await tx.tripWaitlistEntry.updateMany({
            where: {
              tripId,
              status: WaitlistStatus.NOTIFIED,
              userId: { not: userId },
            },
            data: { status: WaitlistStatus.EXPIRED, resolvedAt: new Date() },
          });
        }

        return tx.booking.findUniqueOrThrow({
          where: { id: created.id },
          include: bookingRequestInclude,
        });
      });

      return res.status(201).json({ booking: serializeBooking(booking) });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      if (isUniqueConstraintError(error)) {
        return res.status(409).json({ error: "You already have a booking on this trip" });
      }
      throw error;
    }
  }),
);

export default router;
