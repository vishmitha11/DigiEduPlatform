import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  lecturerProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const courseRouter = createTRPCRouter({
  // ── GET: public list of standalone courses + modules ───────────────────
  listPublic: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.course.findMany({
        where: {
          isPublished: true,
          isStandalone: true,
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { code: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        },
        select: {
          id: true,
          title: true,
          code: true,
          description: true,
          isStandalone: true,
          localPrice: true,
          foreignPrice: true,
          createdAt: true,
          courseLecturers: {
            select: {
              lecturer: {
                select: {
                  title: true,
                  profile: { select: { fullName: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // ── GET: public single course/module by id ──────────────────────────────
  getPublicById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findFirst({
        where: { id: input.id, isPublished: true, isStandalone: true },
        select: {
          id: true,
          title: true,
          code: true,
          description: true,
          isStandalone: true,
          isMandatory: true,
          creditHours: true,
          semester: true,
          year: true,
          localPrice: true,
          foreignPrice: true,
          courseLecturers: {
            select: {
              lecturer: {
                select: {
                  title: true,
                  profile: { select: { fullName: true } },
                },
              },
            },
          },
          sections: {
            select: { id: true, title: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      });
      if (!course)
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      return course;
    }),

  getById: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, lecturer } = ctx;

      const course = await db.course.findUnique({
        where: { id: input.id },
        include: {
          program: {
            include: {
              institution: { select: { name: true } },
            },
          },
          _count: {
            select: {
              courseEnrollments: true,
              assessments: true,
              courseLecturers: true,
            },
          },
          courseLecturers: {
            include: {
              lecturer: {
                include: {
                  profile: { select: { fullName: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const hasAccess = course.courseLecturers.some(
        (cl) => cl.lecturerId === lecturer.id,
      );

      if (!hasAccess && course.createdById !== lecturer.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this course",
        });
      }

      return course;
    }),

  // ── GET: modules assigned to this lecturer ────────────────────────────
  getMyModules: lecturerProcedure.query(async ({ ctx }) => {
    const { db, lecturer } = ctx;

    const modules = await db.courseLecturer.findMany({
      where: {
        lecturerId: lecturer.id,
        course: {
          program: {
            // FIX: removed isPublished: true so lecturers can see all their modules
            // regardless of whether the program has been published yet
            isActive: true,
            approvalStatus: "APPROVED",
          },
        },
      },
      include: {
        course: {
          include: {
            program: {
              select: {
                id: true,
                title: true,
                field: true,
                isPublished: true,
                isActive: true,
                approvalStatus: true,
              },
            },
            courseEnrollments: { select: { id: true } },
            assessments: { select: { id: true } },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    return modules;
  }),

  // ── GET: standalone courses created by this lecturer ──────────────────
  getMyCourses: lecturerProcedure.query(async ({ ctx }) => {
    return ctx.db.course.findMany({
      where: {
        createdById: ctx.lecturer.id,
        isStandalone: true,
      },
      include: {
        assessments: { select: { id: true } },
        courseEnrollments: { select: { id: true, status: true } },
        courseLecturers: {
          include: {
            lecturer: {
              include: { profile: { select: { fullName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ── CREATE: standalone course ─────────────────────────────────────────
  createCourse: lecturerProcedure
    .input(
      z.object({
        title: z.string().min(2),
        code: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        localPrice: z.number().positive().optional().nullable(),
        foreignPrice: z.number().positive().optional().nullable(),
        isPublished: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.create({
        data: {
          ...input,
          isStandalone: true,
          isMandatory: false,
          createdById: ctx.lecturer.id,
        },
      });
      await ctx.db.courseLecturer.create({
        data: {
          courseId: course.id,
          lecturerId: ctx.lecturer.id,
          role: "LECTURER",
        },
      });
      return course;
    }),

  // ── CREATE: module (linked to a program) ──────────────────────────────
  createModule: lecturerProcedure
    .input(
      z.object({
        programId: z.string(),
        title: z.string().min(2),
        code: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        isMandatory: z.boolean().default(true),
        // FIX: orderIndex is now auto-calculated — not accepted from client
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // program (validation), existingCount (orderIndex calc), and
      // programEnrollments (backfill list) are all independent of each
      // other and of the not-yet-created course — resolve them concurrently.
      const [program, existingCount, programEnrollments] = await Promise.all([
        ctx.db.program.findUnique({
          where: { id: input.programId },
          select: {
            institutionId: true,
            approvalStatus: true,
            isPublished: true,
            isActive: true,
          },
        }),
        // FIX: auto-calculate orderIndex as (max existing + 1) so sequential
        // unlock works correctly — never two courses with the same orderIndex
        ctx.db.course.count({
          where: { programId: input.programId },
        }),
        // FIX: if the program already has enrolled students, backfill a
        // CourseEnrollment row for each of them so they can access this
        // new module immediately without re-enrolling
        ctx.db.enrollment.findMany({
          where: {
            programId: input.programId,
            status: { in: ["ACTIVE", "APPROVED"] },
          },
          select: { id: true, studentId: true },
        }),
      ]);

      if (!program) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      if (program.institutionId !== ctx.lecturer.institutionId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Program does not belong to your institution",
        });
      }

      if (program.approvalStatus !== "APPROVED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only add modules to approved programs",
        });
      }

      const course = await ctx.db.course.create({
        data: {
          title: input.title,
          code: input.code,
          description: input.description,
          isMandatory: input.isMandatory,
          orderIndex: existingCount, // 0-based: first = 0, second = 1, etc.
          programId: input.programId,
          isStandalone: false,
          // FIX: auto-publish modules so enrollment always creates
          // CourseEnrollment rows for them. Lecturers can unpublish
          // individual resources (not the whole module) if needed.
          isPublished: true,
          createdById: ctx.lecturer.id,
        },
      });

      await ctx.db.courseLecturer.create({
        data: {
          courseId: course.id,
          lecturerId: ctx.lecturer.id,
          role: "LECTURER",
        },
      });

      if (programEnrollments.length > 0) {
        await ctx.db.courseEnrollment.createMany({
          data: programEnrollments.map((e) => ({
            enrollmentId: e.id,
            studentId: e.studentId,
            courseId: course.id,
            status: "ACTIVE" as const,
          })),
          skipDuplicates: true,
        });
      }

      return course;
    }),

  // ── UPDATE ────────────────────────────────────────────────────────────
  update: lecturerProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(2).optional(),
        code: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        localPrice: z.number().positive().optional().nullable(),
        foreignPrice: z.number().positive().optional().nullable(),
        isPublished: z.boolean().optional(),
        isMandatory: z.boolean().optional(),
        orderIndex: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const course = await ctx.db.course.findUnique({
        where: { id },
        include: {
          courseLecturers: { select: { lecturerId: true } },
        },
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const isCreator = course.createdById === ctx.lecturer.id;
      const isAssigned = course.courseLecturers.some(
        (cl) => cl.lecturerId === ctx.lecturer.id,
      );

      if (!isCreator && !isAssigned) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit courses you created or are assigned to",
        });
      }

      // FIX: removed the check that blocked editing modules from unpublished
      // programs — lecturers need to be able to add content before publishing

      return ctx.db.course.update({ where: { id }, data });
    }),

  // ── TOGGLE PUBLISH ────────────────────────────────────────────────────
  togglePublish: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          courseLecturers: { select: { lecturerId: true } },
        },
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const isCreator = course.createdById === ctx.lecturer.id;
      const isAssigned = course.courseLecturers.some(
        (cl) => cl.lecturerId === ctx.lecturer.id,
      );

      if (!isCreator && !isAssigned) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to publish/unpublish this course",
        });
      }

      return ctx.db.course.update({
        where: { id: input.id },
        data: { isPublished: !course.isPublished },
      });
    }),

  // ── DELETE ────────────────────────────────────────────────────────────
  delete: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          courseLecturers: { select: { lecturerId: true } },
        },
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const isCreator = course.createdById === ctx.lecturer.id;
      const isAssigned = course.courseLecturers.some(
        (cl) => cl.lecturerId === ctx.lecturer.id,
      );

      if (!isCreator && !isAssigned) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete courses you created",
        });
      }

      // Independent cleanup deletes — run concurrently instead of one at a time.
      await Promise.all([
        ctx.db.courseLecturer.deleteMany({ where: { courseId: input.id } }),
        ctx.db.assessment.deleteMany({ where: { courseId: input.id } }),
        ctx.db.courseEnrollment.deleteMany({ where: { courseId: input.id } }),
      ]);

      return ctx.db.course.delete({ where: { id: input.id } });
    }),
});
