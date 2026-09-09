// Boat capacity is total persons aboard and includes the skipper. Client
// booking capacity therefore reserves one seat for the skipper even when a
// skipper has not yet been assigned to the trip.
export function clientBookingCapacity(totalBoatCapacity: number): number {
  if (!Number.isInteger(totalBoatCapacity) || totalBoatCapacity < 1) {
    throw new Error("Boat capacity must be a positive integer");
  }

  return Math.max(0, totalBoatCapacity - 1);
}
