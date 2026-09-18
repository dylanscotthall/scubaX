import {
  BookingStatus,
  Prisma,
  PrismaClient,
} from "../generated/prisma/client";

// Boat capacity is total persons aboard and includes the skipper. Client
// booking capacity therefore reserves one seat for the skipper even when a
// skipper has not yet been assigned to the trip.
export function clientBookingCapacity(totalBoatCapacity: number): number {
  if (!Number.isInteger(totalBoatCapacity) || totalBoatCapacity < 1) {
    throw new Error("Boat capacity must be a positive integer");
  }

  return Math.max(0, totalBoatCapacity - 1);
}

// Total seats occupied by CONFIRMED bookings on a trip, counting each
// booking's full party (the booker plus their guests) rather than just the
// number of booking rows — one booking can occupy more than one seat.
export async function confirmedOccupiedSeats(
  tx: Prisma.TransactionClient | PrismaClient,
  tripId: string,
): Promise<number> {
  const result = await tx.booking.aggregate({
    where: { tripId, status: BookingStatus.CONFIRMED },
    _sum: { partySize: true },
  });
  return result._sum.partySize ?? 0;
}
