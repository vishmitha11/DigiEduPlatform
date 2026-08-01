import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// ── Helper ─────────────────────────────────────────────────────────────────
async function getStudent(db: any, profileId: string) {
  const student = await db.student.findUnique({ where: { profileId } });
  if (!student)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Student profile not found. Please complete your profile setup.",
    });
  return student;
}

export const enrollmentRouter = createTRPCRouter({

  // ── Check enrollment status for a program ────────────────────────────
  checkProgramEnrollment: protectedProcedure
    .input(z.object({ programId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await getStudent(ctx.db, ctx.profile.id);
        const enrollment = await ctx.db.enrollment.findFirst({
          where: { studentId: student.id, programId: input.programId },
          select: { id: true, status: true, createdAt: true },
        });
        return enrollment;
      } catch {
        return null;
      }
    }),

  // ── Check enrollment status for a standalone course ──────────────────
  checkCourseEnrollment: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const student = await getStudent(ctx.db, ctx.profile.id);
        const enrollment = await ctx.db.courseEnrollment.findFirst({
          where: { studentId: student.id, courseId: input.courseId },
          select: { id: true, status: true, createdAt: true },
        });
        return enrollment;
      } catch {
        return null;
      }
    }),

  // ── GET: my program enrollments ──────────────────────────────────────
  getMyProgramEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const student = await getStudent(ctx.db, ctx.profile.id);

    const enrollments = await ctx.db.enrollment.findMany({
      where: {
        studentId: student.id,
        status: { not: "WITHDRAWN" },
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            type: true,
            deliveryMode: true,
            durationMonths: true,
            institution: { select: { id: true, name: true } },
            _count: {
              select: { courses: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // One grouped query instead of one COUNT per enrollment — the previous
    // Promise.all still meant N sequential round trips under this project's
    // connection_limit=1 pooler, since the pool can't actually run them
    // concurrently.
    const completedCounts = enrollments.length > 0
      ? await ctx.db.courseEnrollment.groupBy({
          by: ["enrollmentId"],
          where: {
            enrollmentId: { in: enrollments.map((e) => e.id) },
            status: "COMPLETED",
          },
          _count: { _all: true },
        })
      : [];

    const completedMap = Object.fromEntries(
      completedCounts.map((c) => [c.enrollmentId, c._count._all]),
    );

    return enrollments.map((e) => ({
      ...e,
      completedCourses: completedMap[e.id] ?? 0,
    }));
  }),

  // ── Enroll in a program ──────────────────────────────────────────────
  enrollInProgram: protectedProcedure
    .input(z.object({ programId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      const existing = await ctx.db.enrollment.findFirst({
        where: { studentId: student.id, programId: input.programId },
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already enrolled in this program.",
        });
      }

      const program = await ctx.db.program.findUnique({
        where: { id: input.programId },
        select: {
          id: true,
          title: true,
          localPrice: true,
          foreignPrice: true,
          isPublished: true,
          approvalStatus: true,
        },
      });
      if (!program)
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      if (!program.isPublished || program.approvalStatus !== "APPROVED")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Program is not available for enrollment",
        });

      // FIX: fetch ALL courses for this program with no filters.
      // Previously filtered by isMandatory:true AND isPublished:true which
      // caused zero CourseEnrollment rows to be created when courses were
      // unpublished, locking every module for the student.
      const courses = await ctx.db.course.findMany({
        where: { programId: input.programId },
        select: { id: true },
      });

      const isFree = !program.localPrice || Number(program.localPrice) === 0;

      if (isFree) {
        const enrollment = await ctx.db.enrollment.create({
          data: {
            studentId: student.id,
            programId: input.programId,
            status: "ACTIVE",
            enrollmentDate: new Date(),
          },
        });

        // Create a CourseEnrollment for every course in the program
        if (courses.length > 0) {
          await ctx.db.courseEnrollment.createMany({
            data: courses.map((c) => ({
              enrollmentId: enrollment.id,
              studentId: student.id,
              courseId: c.id,
              status: "ACTIVE" as const,
            })),
            skipDuplicates: true,
          });
        }

        return { type: "enrolled" as const, enrollmentId: enrollment.id };
      }

      // Paid enrollment — create pending payment then enrollment
      const payment = await ctx.db.payment.create({
        data: {
          profileId: ctx.profile.id,
          amount: program.localPrice!,
          currency: "LKR",
          paymentType: "TUITION",
          paymentMethod: "STRIPE",
          status: "PENDING",
        },
      });

      const enrollment = await ctx.db.enrollment.create({
        data: {
          studentId: student.id,
          programId: input.programId,
          status: "PENDING",
          payments: { connect: { id: payment.id } },
        },
      });

      // Still create CourseEnrollment rows even for paid (pending) enrollment
      // so they're ready when payment is confirmed
      if (courses.length > 0) {
        await ctx.db.courseEnrollment.createMany({
          data: courses.map((c) => ({
            enrollmentId: enrollment.id,
            studentId: student.id,
            courseId: c.id,
            status: "ACTIVE" as const,
          })),
          skipDuplicates: true,
        });
      }

      return {
        type: "payment_required" as const,
        enrollmentId: enrollment.id,
        paymentId: payment.id,
        amount: Number(program.localPrice),
        currency: "LKR",
        programTitle: program.title,
      };
    }),

  // ── Enroll in a standalone course ────────────────────────────────────
  enrollInCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      const existing = await ctx.db.courseEnrollment.findFirst({
        where: { studentId: student.id, courseId: input.courseId },
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already enrolled in this course.",
        });
      }

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: {
          id: true,
          title: true,
          localPrice: true,
          foreignPrice: true,
          isPublished: true,
          isStandalone: true,
        },
      });
      if (!course)
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      if (!course.isPublished || !course.isStandalone)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Course is not available for enrollment",
        });

      const isFree = !course.localPrice || Number(course.localPrice) === 0;

      if (isFree) {
        const courseEnrollment = await ctx.db.courseEnrollment.create({
          data: {
            enrollmentId: null,
            studentId: student.id,
            courseId: input.courseId,
            status: "ACTIVE",
          },
        });
        return { type: "enrolled" as const, enrollmentId: courseEnrollment.id };
      }

      const payment = await ctx.db.payment.create({
        data: {
          profileId: ctx.profile.id,
          amount: course.localPrice!,
          currency: "LKR",
          paymentType: "TUITION",
          paymentMethod: "STRIPE",
          status: "PENDING",
        },
      });

      return {
        type: "payment_required" as const,
        paymentId: payment.id,
        amount: Number(course.localPrice),
        currency: "LKR",
        courseTitle: course.title,
      };
    }),
});