import { Router } from "express";
import { z } from "zod";
import {
  AppRole,
  CertAgency,
  CertLevel,
  EnrollmentStatus,
  Prisma,
} from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { notifyCoursePosted, notifyCourseRescheduled } from "../lib/notify";

const router = Router();
const courseStaffRoles: readonly AppRole[] = [
  AppRole.INSTRUCTOR,
  AppRole.ADMIN,
  AppRole.OWNER,
];

const courseAdminRoles = new Set<AppRole>([AppRole.ADMIN, AppRole.OWNER]);

const coursePublicInclude = {
  instructor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  sessions: {
    orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
  },
  _count: {
    select: {
      enrollments: { where: { status: EnrollmentStatus.ENROLLED } },
    },
  },
} satisfies Prisma.CourseInclude;

type PublicCourse = Prisma.CourseGetPayload<{
  include: typeof coursePublicInclude;
}>;

function serializeCourse(course: PublicCourse) {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    agency: course.agency,
    prerequisiteCertLevel: course.prerequisiteCertLevel,
    price: course.price == null ? null : Number(course.price),
    instructor: {
      ...course.instructor,
      name: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
    },
    sessions: course.sessions,
    enrollmentCount: course._count.enrollments,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const courses = await prisma.course.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: coursePublicInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ courses: courses.map(serializeCourse) });
  }),
);

router.get(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      include: coursePublicInclude,
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    return res.json({ course: serializeCourse(course) });
  }),
);

const sessionInputSchema = z
  .object({
    sessionDate: z.string().datetime(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    locationType: z.enum(["pool", "classroom", "open_water"]),
    siteId: z.string().guid().nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

const createCourseSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).nullable().optional(),
    agency: z.nativeEnum(CertAgency).nullable().optional(),
    prerequisiteCertLevel: z.nativeEnum(CertLevel).nullable().optional(),
    price: z.number().nonnegative().max(1_000_000).nullable().optional(),
    sessions: z.array(sessionInputSchema).min(1),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(...courseStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { sessions, ...courseData } = parsed.data;
    const siteIds = Array.from(
      new Set(sessions.map((session) => session.siteId).filter(Boolean)),
    ) as string[];

    if (siteIds.length > 0) {
      const validSiteCount = await prisma.diveSite.count({
        where: {
          id: { in: siteIds },
          organizationId: req.auth!.organizationId,
          active: true,
        },
      });
      if (validSiteCount !== siteIds.length) {
        return res.status(400).json({
          error: "One or more course session sites are invalid or inactive",
        });
      }
    }

    const course = await prisma.course.create({
      data: {
        organizationId: req.auth!.organizationId,
        instructorId: req.auth!.userId,
        name: courseData.name,
        description: courseData.description ?? null,
        agency: courseData.agency ?? null,
        prerequisiteCertLevel: courseData.prerequisiteCertLevel ?? null,
        price: courseData.price ?? null,
        sessions: {
          create: sessions.map((session) => ({
            sessionDate: new Date(session.sessionDate),
            startTime: session.startTime,
            endTime: session.endTime,
            locationType: session.locationType,
            siteId: session.siteId ?? null,
            notes: session.notes ?? null,
          })),
        },
      },
      include: coursePublicInclude,
    });

    await notifyCoursePosted(course.id);
    return res.status(201).json({ course: serializeCourse(course) });
  }),
);

router.post(
  "/:id/enroll",
  requireAuth,
  asyncRoute(async (req, res) => {
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: req.auth!.userId,
        },
      },
      create: { courseId: course.id, userId: req.auth!.userId },
      update: { status: EnrollmentStatus.ENROLLED },
    });

    return res.status(201).json({ enrollment });
  }),
);

const rescheduleSessionSchema = z
  .object({
    sessionDate: z.string().datetime().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

router.patch(
  "/:courseId/sessions/:sessionId",
  requireAuth,
  requireRole(...courseStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = rescheduleSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const course = await prisma.course.findFirst({
      where: {
        id: req.params.courseId,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true, instructorId: true },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isAdmin = req.auth!.roles.some((role) => courseAdminRoles.has(role));
    if (!isAdmin && course.instructorId !== req.auth!.userId) {
      return res
        .status(403)
        .json({ error: "Only the assigned instructor may edit this course" });
    }

    const existingSession = await prisma.courseSession.findFirst({
      where: {
        id: req.params.sessionId,
        courseId: course.id,
      },
      select: { id: true },
    });
    if (!existingSession) {
      return res.status(404).json({ error: "Course session not found" });
    }

    const { message, ...updates } = parsed.data;
    const session = await prisma.courseSession.update({
      where: { id: existingSession.id },
      data: {
        ...(updates.sessionDate && {
          sessionDate: new Date(updates.sessionDate),
        }),
        ...(updates.startTime && { startTime: updates.startTime }),
        ...(updates.endTime && { endTime: updates.endTime }),
      },
    });

    await notifyCourseRescheduled(course.id, message);
    return res.json({ session });
  }),
);

export default router;
