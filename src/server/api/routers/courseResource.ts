import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, lecturerProcedure } from "~/server/api/trpc";

const RESOURCE_TYPES = [
  "PDF",
  "VIDEO_UPLOAD",
  "VIDEO_LINK",
  "IMAGE",
  "PRESENTATION",
  "EXTERNAL_LINK",
] as const;

async function assertCourseAccess(
  db: any,
  courseId: string,
  lecturerId: string,
) {
  // Single query instead of two — one round-trip covers both "owns it" and
  // "assigned to it" via the courseLecturers relation.
  const course = await db.course.findFirst({
    where: {
      id: courseId,
      OR: [{ createdById: lecturerId }, { courseLecturers: { some: { lecturerId } } }],
    },
    select: { id: true },
  });
  if (!course) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this course",
    });
  }
}

export const courseResourceRouter = createTRPCRouter({
  // ── SECTIONS ──────────────────────────────────────────────────────────────

  getSections: lecturerProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCourseAccess(ctx.db, input.courseId, ctx.lecturer.id);
      return ctx.db.courseSection.findMany({
        where: { courseId: input.courseId },
        include: {
          resources: { orderBy: { orderIndex: "asc" } },
        },
        orderBy: { orderIndex: "asc" },
      });
    }),

  createSection: lecturerProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        instructions: z.string().optional().nullable(),
        orderIndex: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCourseAccess(ctx.db, input.courseId, ctx.lecturer.id);
      return ctx.db.courseSection.create({ data: input });
    }),

  updateSection: lecturerProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        instructions: z.string().optional().nullable(),
        orderIndex: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const section = await ctx.db.courseSection.findUnique({ where: { id } });
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCourseAccess(ctx.db, section.courseId, ctx.lecturer.id);
      return ctx.db.courseSection.update({ where: { id }, data });
    }),

  deleteSection: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.courseSection.findUnique({
        where: { id: input.id },
      });
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCourseAccess(ctx.db, section.courseId, ctx.lecturer.id);
      await ctx.db.courseResource.deleteMany({
        where: { sectionId: input.id },
      });
      return ctx.db.courseSection.delete({ where: { id: input.id } });
    }),

  reorderSections: lecturerProcedure
    .input(
      z.object({
        courseId: z.string(),
        items: z.array(
          z.object({ id: z.string(), orderIndex: z.number().int().min(0) }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCourseAccess(ctx.db, input.courseId, ctx.lecturer.id);
      await Promise.all(
        input.items.map((item) =>
          ctx.db.courseSection.update({
            where: { id: item.id },
            data: { orderIndex: item.orderIndex },
          }),
        ),
      );
      return { success: true };
    }),

  // Add to courseResourceRouter
  getStudentViewSections: lecturerProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, lecturer } = ctx;

      // Verify the lecturer has access to this course
      const courseLecturer = await db.courseLecturer.findFirst({
        where: {
          courseId: input.courseId,
          lecturerId: lecturer.id,
        },
        select: { id: true },
      });

      if (!courseLecturer) {
        const course = await db.course.findUnique({
          where: { id: input.courseId },
          select: { createdById: true },
        });

        if (course?.createdById !== lecturer.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this course",
          });
        }
      }

      // Get sections with only published resources for student view
      const sections = await db.courseSection.findMany({
        where: {
          courseId: input.courseId,
        },
        include: {
          resources: {
            where: {
              isPublished: true, // Only show published resources in student view
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      });

      return sections;
    }),

  // ── RESOURCES ─────────────────────────────────────────────────────────────

  create: lecturerProcedure
    .input(
      z.object({
        courseId: z.string(),
        sectionId: z.string().optional().nullable(),
        title: z.string().min(1),
        type: z.enum(RESOURCE_TYPES),
        fileUrl: z.string().url().optional().nullable(),
        externalUrl: z.string().url().optional().nullable(),
        description: z.string().optional().nullable(),
        orderIndex: z.number().int().min(0).default(0),
        isPublished: z.boolean().default(true),
        sizeBytes: z.number().int().optional().nullable(),
        mimeType: z.string().optional().nullable(),
        durationMins: z.number().int().min(1).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCourseAccess(ctx.db, input.courseId, ctx.lecturer.id);
      if (
        ["VIDEO_LINK", "EXTERNAL_LINK"].includes(input.type) &&
        !input.externalUrl
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "External URL is required for this resource type",
        });
      }
      if (
        ["PDF", "VIDEO_UPLOAD", "IMAGE", "PRESENTATION"].includes(input.type) &&
        !input.fileUrl
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File URL is required for this resource type",
        });
      }
      return ctx.db.courseResource.create({ data: input });
    }),

  update: lecturerProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        externalUrl: z.string().url().optional().nullable(),
        fileUrl: z.string().url().optional().nullable(),
        orderIndex: z.number().int().min(0).optional(),
        isPublished: z.boolean().optional(),
        sectionId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const resource = await ctx.db.courseResource.findUnique({
        where: { id },
      });
      if (!resource) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCourseAccess(ctx.db, resource.courseId, ctx.lecturer.id);
      return ctx.db.courseResource.update({ where: { id }, data });
    }),

  togglePublish: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.db.courseResource.findUnique({
        where: { id: input.id },
      });
      if (!resource) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCourseAccess(ctx.db, resource.courseId, ctx.lecturer.id);
      return ctx.db.courseResource.update({
        where: { id: input.id },
        data: { isPublished: !resource.isPublished },
      });
    }),

  delete: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.db.courseResource.findUnique({
        where: { id: input.id },
      });
      if (!resource) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCourseAccess(ctx.db, resource.courseId, ctx.lecturer.id);
      return ctx.db.courseResource.delete({ where: { id: input.id } });
    }),

  // Legacy — kept for backward compat
  getByCourse: lecturerProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCourseAccess(ctx.db, input.courseId, ctx.lecturer.id);
      return ctx.db.courseResource.findMany({
        where: { courseId: input.courseId },
        orderBy: { orderIndex: "asc" },
      });
    }),

  reorder: lecturerProcedure
    .input(
      z.object({
        courseId: z.string(),
        items: z.array(
          z.object({ id: z.string(), orderIndex: z.number().int().min(0) }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCourseAccess(ctx.db, input.courseId, ctx.lecturer.id);
      await Promise.all(
        input.items.map((item) =>
          ctx.db.courseResource.update({
            where: { id: item.id },
            data: { orderIndex: item.orderIndex },
          }),
        ),
      );
      return { success: true };
    }),
});