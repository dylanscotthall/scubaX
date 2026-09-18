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
import { asyncRoute, HttpError } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { notifyCoursePosted, notifyCourseRescheduled } from "../lib/notify";
import { meetsCertLevel } from "../lib/certification";

const router = Router();
const courseStaffRoles: readonly AppRole[] = [
  AppRole.INSTRUCTOR,
  AppRole.ADMIN,
  AppRole.OWNER,
];

const courseAdminRoles = new Set<AppRole>([AppRole.ADMIN, AppRole.OWNER]);

function isCourseStaff(roles: AppRole[]): boolean {
  return roles.some((role) => courseStaffRoles.includes(role));
}

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

// viewerCertLevel/viewerSpecialties belong to whoever is looking at the
// list, not the course — used to compute alreadyQualified/meetsPrerequisite
// so mobile never has to re-implement the cert comparison.
function serializeCourse(
  course: PublicCourse,
  viewer: { certLevel: CertLevel | null; certSpecialties: string[] },
) {
  const alreadyQualified = course.grantsCertLevel
    ? meetsCertLevel(viewer.certLevel, course.grantsCertLevel)
    : course.grantsSpecialty
      ? viewer.certSpecialties.some(
          (specialty) =>
            specialty.trim().toLowerCase() ===
            course.grantsSpecialty!.trim().toLowerCase(),
        )
      : false;

  const meetsPrerequisite = course.prerequisiteCertLevel
    ? meetsCertLevel(viewer.certLevel, course.prerequisiteCertLevel)
    : true;

  return {
    id: course.id,
    name: course.name,
    description: course.description,
    agency: course.agency,
    prerequisiteCertLevel: course.prerequisiteCertLevel,
    grantsCertLevel: course.grantsCertLevel,
    grantsSpecialty: course.grantsSpecialty,
    active: course.active,
    price: course.price == null ? null : Number(course.price),
    instructor: {
      ...course.instructor,
      name: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
    },
    sessions: course.sessions,
    enrollmentCount: course._count.enrollments,
    alreadyQualified,
    meetsPrerequisite,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

async function loadViewerCertProfile(userId: string) {
  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { certLevel: true, certSpecialties: true },
  });
  return viewer ?? { certLevel: null, certSpecialties: [] };
}

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const staff = isCourseStaff(req.auth!.roles);
    const [courses, viewer] = await Promise.all([
      prisma.course.findMany({
        where: {
          organizationId: req.auth!.organizationId,
          ...(staff ? {} : { active: true }),
        },
        include: coursePublicInclude,
        orderBy: { createdAt: "desc" },
      }),
      loadViewerCertProfile(req.auth!.userId),
    ]);

    return res.json({
      courses: courses.map((course) => serializeCourse(course, viewer)),
    });
  }),
);

const courseWithRosterInclude = {
  ...coursePublicInclude,
  enrollments: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { enrolledAt: "asc" as const },
  },
} satisfies Prisma.CourseInclude;

router.get(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const staff = isCourseStaff(req.auth!.roles);
    const course = await prisma.course.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      include: courseWithRosterInclude,
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const viewer = await loadViewerCertProfile(req.auth!.userId);
    const serialized = serializeCourse(course, viewer);

    if (!staff) {
      return res.json({ course: serialized });
    }

    const roster = course.enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      client: {
        ...enrollment.user,
        name: `${enrollment.user.firstName} ${enrollment.user.lastName}`.trim(),
      },
    }));
    return res.json({ course: { ...serialized, enrollments: roster } });
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

function checkGrantsAreExclusive(
  value: { grantsCertLevel?: CertLevel | null; grantsSpecialty?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (value.grantsCertLevel != null && value.grantsSpecialty != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["grantsSpecialty"],
      message: "A course grants either a cert level or a specialty, not both",
    });
  }
}

const createCourseSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(5000).nullable().optional(),
    agency: z.nativeEnum(CertAgency).nullable().optional(),
    prerequisiteCertLevel: z.nativeEnum(CertLevel).nullable().optional(),
    grantsCertLevel: z.nativeEnum(CertLevel).nullable().optional(),
    grantsSpecialty: z.string().trim().min(1).max(100).nullable().optional(),
    price: z.number().nonnegative().max(1_000_000).nullable().optional(),
    sessions: z.array(sessionInputSchema).min(1),
  })
  .strict()
  .superRefine(checkGrantsAreExclusive);

const updateCourseSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    agency: z.nativeEnum(CertAgency).nullable().optional(),
    prerequisiteCertLevel: z.nativeEnum(CertLevel).nullable().optional(),
    grantsCertLevel: z.nativeEnum(CertLevel).nullable().optional(),
    grantsSpecialty: z.string().trim().min(1).max(100).nullable().optional(),
    price: z.number().nonnegative().max(1_000_000).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .superRefine(checkGrantsAreExclusive)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

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
        grantsCertLevel: courseData.grantsCertLevel ?? null,
        grantsSpecialty: courseData.grantsSpecialty ?? null,
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
    const viewer = await loadViewerCertProfile(req.auth!.userId);
    return res.status(201).json({ course: serializeCourse(course, viewer) });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(...courseStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = updateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.course.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      select: { id: true, instructorId: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isAdmin = req.auth!.roles.some((role) => courseAdminRoles.has(role));
    if (!isAdmin && existing.instructorId !== req.auth!.userId) {
      return res
        .status(403)
        .json({ error: "Only the assigned instructor may edit this course" });
    }

    const data = parsed.data;
    // Setting one of grantsCertLevel/grantsSpecialty clears the other, so a
    // partial update can never leave both set even though the incoming
    // request only ever touches one of them at a time.
    const clearsSpecialty = data.grantsCertLevel !== undefined && data.grantsCertLevel !== null;
    const clearsCertLevel = data.grantsSpecialty !== undefined && data.grantsSpecialty !== null;

    const course = await prisma.course.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.agency !== undefined && { agency: data.agency }),
        ...(data.prerequisiteCertLevel !== undefined && {
          prerequisiteCertLevel: data.prerequisiteCertLevel,
        }),
        ...(data.grantsCertLevel !== undefined && {
          grantsCertLevel: data.grantsCertLevel,
        }),
        ...(data.grantsSpecialty !== undefined && {
          grantsSpecialty: data.grantsSpecialty,
        }),
        ...(clearsSpecialty && { grantsSpecialty: null }),
        ...(clearsCertLevel && { grantsCertLevel: null }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: coursePublicInclude,
    });

    const viewer = await loadViewerCertProfile(req.auth!.userId);
    return res.json({ course: serializeCourse(course, viewer) });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(...courseStaffRoles),
  asyncRoute(async (req, res) => {
    const existing = await prisma.course.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      select: {
        id: true,
        instructorId: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isAdmin = req.auth!.roles.some((role) => courseAdminRoles.has(role));
    if (!isAdmin && existing.instructorId !== req.auth!.userId) {
      return res
        .status(403)
        .json({ error: "Only the assigned instructor may remove this course" });
    }

    if (existing._count.enrollments === 0) {
      // Sessions cascade-delete with the course; no enrollment history to lose.
      await prisma.course.delete({ where: { id: existing.id } });
      return res.status(204).send();
    }

    // Has (or had) real enrollments — retire rather than lose history,
    // same pattern as EquipmentItem.
    await prisma.course.update({
      where: { id: existing.id },
      data: { active: false },
    });
    return res.status(200).json({ deactivated: true });
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

const completeEnrollmentSchema = z
  .object({ applyCertUpdate: z.boolean() })
  .strict();

// Manual staff confirmation of a completed course — never automatic. When
// applyCertUpdate is true and the course grants something, this is also the
// only place a client's certification profile can be changed by someone
// other than themselves.
router.post(
  "/:id/enrollments/:enrollmentId/complete",
  requireAuth,
  requireRole(...courseStaffRoles),
  asyncRoute(async (req, res) => {
    const parsed = completeEnrollmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const course = await prisma.course.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      select: {
        id: true,
        instructorId: true,
        grantsCertLevel: true,
        grantsSpecialty: true,
      },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isAdmin = req.auth!.roles.some((role) => courseAdminRoles.has(role));
    if (!isAdmin && course.instructorId !== req.auth!.userId) {
      return res.status(403).json({
        error: "Only the assigned instructor may mark this course complete",
      });
    }

    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { id: req.params.enrollmentId, courseId: course.id },
      select: { id: true, userId: true },
    });
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const updatedEnrollment = await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.COMPLETED },
    });

    if (parsed.data.applyCertUpdate && (course.grantsCertLevel || course.grantsSpecialty)) {
      const student = await prisma.user.findUnique({
        where: { id: enrollment.userId },
        select: { certLevel: true, certSpecialties: true },
      });

      if (course.grantsCertLevel) {
        if (!meetsCertLevel(student?.certLevel, course.grantsCertLevel)) {
          await prisma.user.update({
            where: { id: enrollment.userId },
            data: { certLevel: course.grantsCertLevel },
          });
        }
      } else if (course.grantsSpecialty) {
        const already = (student?.certSpecialties ?? []).some(
          (specialty) =>
            specialty.trim().toLowerCase() ===
            course.grantsSpecialty!.trim().toLowerCase(),
        );
        if (!already) {
          await prisma.user.update({
            where: { id: enrollment.userId },
            data: {
              certSpecialties: {
                push: course.grantsSpecialty,
              },
            },
          });
        }
      }
    }

    return res.json({ enrollment: updatedEnrollment });
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
