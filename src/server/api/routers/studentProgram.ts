import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// ── Helper: get student record for current user ───────────────────────────
async function getStudent(db: any, profileId: string) {
  const student = await db.student.findUnique({
    where: { profileId },
    select: { id: true },
  });
  if (!student) throw new TRPCError({ code: "FORBIDDEN", message: "Student profile not found" });
  return student;
}

export const studentProgramRouter = createTRPCRouter({

  // ── GET: full program detail with all modules, sections, resources, progress ──
  getProgramDetail: protectedProcedure
    .input(z.object({ programId: z.string() }))
    .query(async ({ ctx, input }) => {
      // student and program don't depend on each other — fetch in parallel.
      const [student, program] = await Promise.all([
        getStudent(ctx.db, ctx.profile.id),
        ctx.db.program.findUnique({
          where: { id: input.programId },
          include: {
            institution: { select: { name: true, logoUrl: true } },
            courses: {
              // Only show published modules to students.
              // When a lecturer unpublishes a module it disappears from the
              // student view immediately; re-publishing restores it.
              where: { isPublished: true },
              orderBy: { orderIndex: "asc" },
              include: {
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
                  orderBy: { orderIndex: "asc" },
                  include: {
                    resources: {
                      // Only show published resources to students
                      where: { isPublished: true },
                      orderBy: { orderIndex: "asc" },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      if (!program) throw new TRPCError({ code: "NOT_FOUND" });

      const courseIds = program.courses.map((c) => c.id);

      // Enrollment check, course-enrollments and resource-progress are all
      // independent of each other once student.id and courseIds are known —
      // run them together instead of one after another.
      const [enrollment, courseEnrollments, progress] = await Promise.all([
        ctx.db.enrollment.findFirst({
          where: { studentId: student.id, programId: input.programId },
        }),
        ctx.db.courseEnrollment.findMany({
          where: { studentId: student.id, courseId: { in: courseIds } },
          select: { courseId: true, status: true },
        }),
        ctx.db.resourceProgress.findMany({
          where: {
            studentId: student.id,
            resource: { courseId: { in: courseIds } },
          },
          select: { resourceId: true, resource: { select: { courseId: true } } },
        }),
      ]);

      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this program" });
      }

      const enrolledCourseIds = new Set(courseEnrollments.map((e) => e.courseId));
      const courseStatusMap = Object.fromEntries(
        courseEnrollments.map((e) => [e.courseId, e.status])
      );

      const completedSet = new Set(progress.map((p) => p.resourceId));
      const completedByCourse: Record<string, Set<string>> = {};
      progress.forEach((p) => {
        const cId = p.resource.courseId;
        if (!completedByCourse[cId]) completedByCourse[cId] = new Set();
        completedByCourse[cId]!.add(p.resourceId);
      });

      // Build modules with unlock logic — mirrors getCourseDetail section unlock logic
      const modulesWithStatus = program.courses.map((course, moduleIdx) => {
        const isEnrolled = enrolledCourseIds.has(course.id);
        const status = courseStatusMap[course.id] ?? null;

        // Module unlock: first module always unlocked if enrolled.
        // Subsequent modules unlock ONLY when the previous module has
        // resources AND all of them are completed.
        // A module with zero resources does NOT unlock the next one —
        // the lecturer must add content before students can progress.
        let isModuleUnlocked = false;
        if (isEnrolled) {
          if (moduleIdx === 0) {
            isModuleUnlocked = true;
          } else {
            const prevCourse = program.courses[moduleIdx - 1]!;
            const prevTotal = prevCourse.sections.reduce(
              (s, sec) => s + sec.resources.length, 0
            );
            const prevCompleted = completedByCourse[prevCourse.id]?.size ?? 0;
            // FIXED: prevTotal must be > 0 AND fully completed to unlock next
            isModuleUnlocked = prevTotal > 0 && prevCompleted === prevTotal;
          }
        }

        // Section unlock logic — identical to getCourseDetail
        const sectionsWithStatus = course.sections.map((section, secIdx) => {
          const totalInSection = section.resources.length;
          const completedInSection = section.resources.filter((r) =>
            completedSet.has(r.id)
          ).length;
          const sectionComplete = totalInSection > 0 && completedInSection === totalInSection;

          let isSectionUnlocked = false;
          if (isModuleUnlocked) {
            if (secIdx === 0) {
              isSectionUnlocked = true;
            } else {
              const prevSection = course.sections[secIdx - 1]!;
              const prevTotal = prevSection.resources.length;
              const prevCompleted = prevSection.resources.filter((r) =>
                completedSet.has(r.id)
              ).length;
              // FIXED: section must have resources AND be fully complete to unlock next
            isSectionUnlocked = prevTotal > 0 && prevCompleted === prevTotal;
            }
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
            isUnlocked: isSectionUnlocked,
          };
        });

        const totalResources = sectionsWithStatus.reduce((s, sec) => s + sec.totalResources, 0);
        const completedResources = completedByCourse[course.id]?.size ?? 0;
        const progressPercent = totalResources > 0
          ? Math.round((completedResources / totalResources) * 100)
          : 0;

        const lecturer = course.courseLecturers[0]?.lecturer;
        const lecturerName = lecturer?.profile?.fullName
          ? `${lecturer.title ? `${lecturer.title} ` : ""}${lecturer.profile.fullName}`
          : null;

        return {
          ...course,
          sections: sectionsWithStatus,
          isEnrolled,
          isUnlocked: isModuleUnlocked,
          status,
          lecturerName,
          totalResources,
          completedResources,
          progressPercent,
        };
      });

      const totalModules = modulesWithStatus.length;
      const completedModules = modulesWithStatus.filter((m) => m.progressPercent === 100).length;
      const programProgress = totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

      const totalResources = modulesWithStatus.reduce((s, m) => s + m.totalResources, 0);
      const completedResources = modulesWithStatus.reduce((s, m) => s + m.completedResources, 0);

      return {
        ...program,
        courses: modulesWithStatus,
        enrollment,
        totalModules,
        completedModules,
        programProgress,
        totalResources,
        completedResources,
      };
    }),
});