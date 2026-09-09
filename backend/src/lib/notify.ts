import { prisma } from "./prisma";
import { AppRole } from "../generated/prisma/client";

// Push-only, no SMS/WhatsApp — explicit client decision (goal is to move
// the business OFF WhatsApp entirely).
//
// Uses Expo's push notification service. Docs: https://docs.expo.dev/push-notifications/sending-notifications/
// This talks to Expo's servers directly with fetch — no SDK dependency needed
// for basic sending, keeps the backend lighter.
const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendExpoPush(messages: PushPayload[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("Expo push send failed:", res.status, await res.text());
    }
  } catch (error) {
    // Push delivery is best-effort for now. A DNS, timeout or Expo service
    // failure must not turn an already-completed booking/cancellation into a
    // misleading API 500 response.
    console.error("Expo push request failed:", error);
  }
}

async function pushToUser(
  organizationId: string,
  userId: string,
  type: string,
  title: string,
  body: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<void> {
  const [tokens] = await Promise.all([
    prisma.pushToken.findMany({ where: { userId } }),
    prisma.notification.create({
      data: {
        organizationId,
        userId,
        type,
        title,
        body,
        relatedEntityType,
        relatedEntityId,
      },
    }),
  ]);

  await sendExpoPush(
    tokens.map((t) => ({
      to: t.expoPushToken,
      title,
      body,
      data: { type, relatedEntityType, relatedEntityId },
    }))
  );
}

export async function notifySiteFollowers(
  organizationId: string,
  siteId: string,
  tripId: string
): Promise<void> {
  const [followers, site] = await Promise.all([
    prisma.siteFollow.findMany({ where: { siteId }, select: { userId: true } }),
    prisma.diveSite.findUnique({ where: { id: siteId } }),
  ]);

  await Promise.all(
    followers.map((f) =>
      pushToUser(
        organizationId,
        f.userId,
        "site_trip_scheduled",
        "A trip to your followed site is on!",
        `A dive to ${site?.name ?? "your followed site"} has just been scheduled. Book your spot.`,
        "trip",
        tripId
      )
    )
  );
}

export async function notifyTripCancelled(
  tripId: string,
  affectedUserIds: string[],
): Promise<void> {
  if (affectedUserIds.length === 0) return;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { boat: true },
  });
  if (!trip) return;

  await Promise.all(
    Array.from(new Set(affectedUserIds)).map((userId) =>
      pushToUser(
        trip.organizationId,
        userId,
        "trip_cancelled",
        "Your dive was cancelled",
        `Your dive on ${trip.boat.name} has been cancelled: ${trip.cancelledReason ?? "see app for details"}. Staff will contact you about rebooking arrangements.`,
        "trip",
        trip.id,
      ),
    ),
  );
}

// Open-race waitlist: notify EVERYONE waiting at once, first to claim wins.
// Client decision — deliberately not sequential/FIFO.
export async function notifyWaitlistSpotOpen(tripId: string): Promise<void> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      waitlistEntries: { where: { status: "WAITING" }, select: { userId: true } },
      boat: true,
    },
  });
  if (!trip) return;

  await prisma.tripWaitlistEntry.updateMany({
    where: { tripId, status: "WAITING" },
    data: { status: "NOTIFIED", notifiedAt: new Date() },
  });

  await Promise.all(
    trip.waitlistEntries.map((w) =>
      pushToUser(
        trip.organizationId,
        w.userId,
        "waitlist_spot_open",
        "A spot just opened up!",
        `A spot is open on the ${trip.boat.name} trip you're waitlisted for. First to confirm gets it — open the app now.`,
        "trip",
        trip.id
      )
    )
  );
}

// Wired up from the console.log stub in courses.ts. v1 simplification per
// plan doc 3.4a: full cert-history matching against SSI/PADI is deferred,
// so this notifies every CLIENT whose current certLevel doesn't already
// match the course's prerequisite — a rough but honest proxy for "who
// might want this." Courses with no prerequisite notify every client,
// since anyone could enroll.
export async function notifyCoursePosted(courseId: string): Promise<void> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return;

  const candidates = await prisma.user.findMany({
    where: {
      organizationId: course.organizationId,
      roles: { some: { role: AppRole.CLIENT } },
      ...(course.prerequisiteCertLevel
        ? { OR: [{ certLevel: null }, { certLevel: { not: course.prerequisiteCertLevel } }] }
        : {}),
    },
    select: { id: true },
  });

  await Promise.all(
    candidates.map((c) =>
      pushToUser(
        course.organizationId,
        c.id,
        "course_posted",
        `New course: ${course.name}`,
        `A new ${course.name} course has just been posted — check it out in the app.`,
        "course",
        course.id
      )
    )
  );
}

export async function notifyCourseRescheduled(
  courseId: string,
  message: string
): Promise<void> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId, status: "ENROLLED" },
    include: { course: true },
  });

  await Promise.all(
    enrollments.map((e) =>
      pushToUser(
        e.course.organizationId,
        e.userId,
        "course_rescheduled",
        `${e.course.name} — schedule change`,
        message,
        "course",
        courseId
      )
    )
  );
}
