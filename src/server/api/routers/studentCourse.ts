import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// ── Helper: get student record for current user ───────────────────────────
async function getStudent(db: any, profileId: string) {
  const student = await db.student.findUnique({
    where: { profileId },
    select: { id: true },
  });
  if (!student)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Student profile not found",
    });
  return student;
}

export const studentCourseRouter = createTRPCRouter({
  // ── GET: all enrolled courses with progress ───────────────────────────
  getMyEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const student = await getStudent(ctx.db, ctx.profile.id);

    // These two queries are independent (both only need student.id) — run
    // them concurrently instead of sequentially. The progress query no
    // longer filters by courseIds from the first query since it doesn't
    // need to: completedByCourse below is keyed off each enrollment's own
    // courseId, so any extra rows for un-enrolled courses are just unused.
    const [enrollments, progress] = await Promise.all([
      ctx.db.courseEnrollment.findMany({
        where: {
          studentId: student.id,
          status: { not: "WITHDRAWN" },
          course: { isStandalone: true },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              code: true,
              description: true,
              isStandalone: true,
              localPrice: true,
              foreignPrice: true,
              program: { select: { title: true, type: true } },
              courseLecturers: {
                take: 1,
                include: {
                  lecturer: {
                    select: {
                      title: true,
                      profile: { select: { fullName: true } },
                    },
                  },
                },
              },
              sections: {
                select: {
                  id: true,
                  resources: { select: { id: true } },
                },
              },
              _count: { select: { assessments: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.resourceProgress.findMany({
        where: { studentId: student.id },
        select: { resourceId: true, resource: { select: { courseId: true } } },
      }),
    ]);

    const completedByCourse: Record<string, Set<string>> = {};
    progress.forEach((p) => {
      const cId = p.resource.courseId;
      if (!completedByCourse[cId]) completedByCourse[cId] = new Set();
      completedByCourse[cId]!.add(p.resourceId);
    });

    return enrollments.map((e) => {
      const totalResources = e.course.sections.reduce(
        (s, sec) => s + sec.resources.length,
        0,
      );
      const completedResources = completedByCourse[e.courseId]?.size ?? 0;
      const progressPercent =
        totalResources > 0
          ? Math.round((completedResources / totalResources) * 100)
          : 0;

      return {
        ...e,
        totalResources,
        completedResources,
        progressPercent,
      };
    });
  }),

  // ── GET: course detail with sections, resources, progress ─────────────
  getCourseDetail: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // student and course don't depend on each other — fetch in parallel.
      const [student, course] = await Promise.all([
        getStudent(ctx.db, ctx.profile.id),
        ctx.db.course.findUnique({
          where: { id: input.courseId },
          include: {
            program: { select: { title: true, type: true } },
            courseLecturers: {
              include: {
                lecturer: {
                  select: {
                    title: true,
                    bio: true,
                    profile: { select: { fullName: true, email: true } },
                  },
                },
              },
            },
            sections: {
              orderBy: { orderIndex: "asc" },
              include: {
                resources: {
                  where: { isPublished: true },
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
            _count: { select: { assessments: true } },
          },
        }),
      ]);

      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      // Enrollment check and progress lookup are also independent of each
      // other once student.id is known — run together instead of in series.
      const [enrollment, completed] = await Promise.all([
        ctx.db.courseEnrollment.findFirst({
          where: { studentId: student.id, courseId: input.courseId },
        }),
        ctx.db.resourceProgress.findMany({
          where: {
            studentId: student.id,
            resource: { courseId: input.courseId },
          },
          select: { resourceId: true },
        }),
      ]);

      if (!enrollment)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enrolled in this course",
        });

      const completedSet = new Set(completed.map((c) => c.resourceId));

      // Section unlock logic — sections unlock in order
      // A section is unlocked if it's the first, or the previous section is 100% complete
      const sectionsWithStatus = course.sections.map((section, idx) => {
        const totalInSection = section.resources.length;
        const completedInSection = section.resources.filter((r) =>
          completedSet.has(r.id),
        ).length;
        const sectionComplete =
          totalInSection > 0 && completedInSection === totalInSection;

        let isUnlocked = idx === 0; // first section always unlocked
        if (idx > 0) {
          const prev = course.sections[idx - 1]!;
          const prevTotal = prev.resources.length;
          const prevCompleted = prev.resources.filter((r) =>
            completedSet.has(r.id),
          ).length;
          isUnlocked = prevTotal === 0 || prevCompleted === prevTotal;
        }

        return {
          ...section,
          resources: section.resources.map((r) => ({
            ...r,
            isCompleted: completedSet.has(r.id),
          })),
          totalResources: totalInSection,
          completedResources: completedInSection,
          isComplete: sectionComplete,
          isUnlocked,
        };
      });

      const totalResources = course.sections.reduce(
        (s, sec) => s + sec.resources.length,
        0,
      );
      const completedResources = completedSet.size;
      const progressPercent =
        totalResources > 0
          ? Math.round((completedResources / totalResources) * 100)
          : 0;

      return {
        ...course,
        sections: sectionsWithStatus,
        enrollment,
        totalResources,
        completedResources,
        progressPercent,
      };
    }),

  // ── MUTATION: mark resource complete/incomplete ───────────────────────
  toggleResourceComplete: protectedProcedure
    .input(z.object({ resourceId: z.string(), courseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      const existing = await ctx.db.resourceProgress.findUnique({
        where: {
          studentId_resourceId: {
            studentId: student.id,
            resourceId: input.resourceId,
          },
        },
      });

      if (existing) {
        await ctx.db.resourceProgress.delete({
          where: {
            studentId_resourceId: {
              studentId: student.id,
              resourceId: input.resourceId,
            },
          },
        });
        return { completed: false };
      } else {
        await ctx.db.resourceProgress.create({
          data: { studentId: student.id, resourceId: input.resourceId },
        });
        return { completed: true };
      }
    }),

  // ── GET: assessments for a course with my submissions ─────────────────
  getCourseAssessments: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      // Enrollment check and the assessments list are independent once
      // student.id is known — run together instead of in series.
      const [enrollment, assessments] = await Promise.all([
        ctx.db.courseEnrollment.findFirst({
          where: { studentId: student.id, courseId: input.courseId },
        }),
        ctx.db.assessment.findMany({
          where: { courseId: input.courseId },
          include: {
            submissions: {
              where: { studentId: student.id },
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      if (!enrollment)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled" });

      return assessments.map((a) => ({
        ...a,
        mySubmission: a.submissions[0] ?? null,
      }));
    }),

  // ── MUTATION: submit assessment ───────────────────────────────────────
  submitAssessment: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        submissionText: z.string().optional().nullable(),
        fileUrl: z.string().url().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // student and assessment are independent lookups — resolve concurrently.
      const [student, assessment] = await Promise.all([
        getStudent(ctx.db, ctx.profile.id),
        ctx.db.assessment.findUnique({
          where: { id: input.assessmentId },
          select: { courseId: true, dueDate: true },
        }),
      ]);
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });

      // Enrollment check and existing-submission check are independent of
      // each other once student+assessment are known — resolve concurrently.
      const [enrollment, existing] = await Promise.all([
        ctx.db.courseEnrollment.findFirst({
          where: { studentId: student.id, courseId: assessment.courseId },
        }),
        ctx.db.assessmentSubmission.findFirst({
          where: { assessmentId: input.assessmentId, studentId: student.id },
        }),
      ]);
      if (!enrollment)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled" });

      if (!input.submissionText && !input.fileUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Submission must include text or a file",
        });
      }

      if (existing && existing.status === "GRADED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assessment has already been graded",
        });
      }

      if (existing) {
        // Update existing (resubmission)
        return ctx.db.assessmentSubmission.update({
          where: { id: existing.id },
          data: {
            submissionText: input.submissionText ?? null,
            fileUrl: input.fileUrl ?? null,
            submittedAt: new Date(),
            status: "SUBMITTED",
          },
        });
      }

      return ctx.db.assessmentSubmission.create({
        data: {
          assessmentId: input.assessmentId,
          studentId: student.id,
          submissionText: input.submissionText ?? null,
          fileUrl: input.fileUrl ?? null,
          status: "SUBMITTED",
        },
      });
    }),

  // ── GET: all grades for a course ──────────────────────────────────────
  getCourseGrades: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      const submissions = await ctx.db.assessmentSubmission.findMany({
        where: {
          studentId: student.id,
          assessment: { courseId: input.courseId },
        },
        include: {
          assessment: {
            select: {
              title: true,
              type: true,
              totalMarks: true,
              passMarks: true,
              weightPercent: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      return submissions;
    }),
});
