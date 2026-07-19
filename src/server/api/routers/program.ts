import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  lecturerProcedure,
  managerProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const programInput = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().optional(),
  type: z.enum(["FOUNDATION","DIPLOMA","CERTIFICATE","BACHELOR","MASTER","PHD","PROFESSIONAL","MICROCREDENTIAL","SHORT_COURSE"]),
  level: z.enum(["ENTRY","UNDERGRADUATE","POSTGRADUATE","RESEARCH"]),
  field: z.enum(["ENGINEERING","INFORMATION_TECHNOLOGY","BUSINESS_MANAGEMENT","ACCOUNTING_FINANCE","MEDICINE","HEALTHCARE","NURSING","PHARMACY","BIO_TECHNOLOGY","AGRICULTURE","ENVIRONMENTAL_SCIENCE","LAW","PSYCHOLOGY","SOCIAL_SCIENCE","EDUCATION","ARTS","ARCHITECTURE","MEDIA_COMMUNICATION","JOURNALISM","LOGISTICS","TOURISM_HOSPITALITY","MARITIME","FASHION_DESIGN","INTERIOR_DESIGN","GRAPHIC_DESIGN","MUSIC","PERFORMING_ARTS","SPORTS_SCIENCE","POLITICAL_SCIENCE","ECONOMICS","MATHEMATICS","PHYSICS","CHEMISTRY","DATA_SCIENCE","ARTIFICIAL_INTELLIGENCE","CYBER_SECURITY","OTHER"]),
  durationMonths: z.number().int().positive().optional().nullable(),
  deliveryMode: z.enum(["ONLINE","ON_CAMPUS","HYBRID","BLENDED"]),
  language: z.array(z.string()).min(1, "At least one language required"),
  description: z.string().optional().nullable(),
  entryRequirements: z.string().optional().nullable(),
  careerOutcomes: z.string().optional().nullable(),
  creditPoints: z.number().int().positive().optional().nullable(),
  creditFramework: z.string().optional().nullable(),
  localPrice: z.number().positive().optional().nullable(),
  foreignPrice: z.number().positive().optional().nullable(),
  scholarshipAvailable: z.boolean().default(false),
});

function isProgramComplete(data: z.infer<typeof programInput>): boolean {
  return !!(
    data.title?.trim() && data.type && data.level && data.field &&
    data.deliveryMode && data.language.length > 0 &&
    data.description?.trim() && data.durationMonths
  );
}

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// foreignPrice is entered directly in USD (the international-student rate,
// which is what the recommendation engine's budget matching compares
// against) — see src/lib/recommendation/hardFilters.ts. Keeping priceUsd
// in sync here means new/edited programs stay matchable without a
// separate backfill step.
function priceUsdFields(foreignPrice: number | null | undefined) {
  return {
    priceUsd: foreignPrice ?? null,
    priceUsdUpdatedAt: foreignPrice != null ? new Date() : null,
  };
}

export const programRouter = createTRPCRouter({

  listPublic: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      field: z.string().optional(),
      level: z.string().optional(),
      deliveryMode: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.program.findMany({
        where: {
          isPublished: true, isActive: true, approvalStatus: "APPROVED",
          ...(input.search && { OR: [
            { title: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
            { institution: { name: { contains: input.search, mode: "insensitive" } } },
          ]}),
          ...(input.field && { field: input.field as any }),
          ...(input.level && { level: input.level as any }),
          ...(input.deliveryMode && { deliveryMode: input.deliveryMode as any }),
        },
        include: {
          institution: { select: { id: true, name: true, city: true, country: true, isVerified: true } },
          courses: { select: { id: true }, where: { isPublished: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getPublicById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const program = await ctx.db.program.findFirst({
        where: { id: input.id, isPublished: true, isActive: true, approvalStatus: "APPROVED" },
        include: {
          institution: { select: { id: true, name: true, city: true, country: true, isVerified: true, website: true, email: true } },
          courses: {
            where: { isPublished: true },
            select: { id: true, title: true, description: true, isMandatory: true, orderIndex: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      });
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      return program;
    }),

  // FIX: removed isPublished:true filter — lecturers must be able to see
  // their programs even before they are published so they can add modules/content
  getMyPrograms: lecturerProcedure.query(async ({ ctx }) => {
    const { db, lecturer } = ctx;

    const lecturerRecord = await db.lecturer.findUnique({
      where: { id: lecturer.id },
      select: { institutionId: true },
    });

    if (!lecturerRecord?.institutionId) return [];

    return db.program.findMany({
      where: {
        institutionId: lecturerRecord.institutionId,
        isActive: true,
        approvalStatus: "APPROVED",
        // NOTE: isPublished filter intentionally removed — lecturers need
        // to see unpublished programs to add modules before going live
      },
      include: {
        createdBy: {
          include: { profile: { select: { fullName: true, email: true } } },
        },
        _count: { select: { courses: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // FIX: same — institution programs for module creation should show all
  // approved programs regardless of publish status
  getInstitutionPrograms: lecturerProcedure.query(async ({ ctx }) => {
    const { db, lecturer } = ctx;
    if (!lecturer.institutionId) return [];

    return db.program.findMany({
      where: {
        institutionId: lecturer.institutionId,
        approvalStatus: "APPROVED",
        isActive: true,
        // NOTE: isPublished filter intentionally removed
      },
      select: { id: true, title: true, type: true, isPublished: true },
      orderBy: { title: "asc" },
    });
  }),

  getPendingReview: managerProcedure.query(async ({ ctx }) => {
    return ctx.db.program.findMany({
      where: { institutionId: ctx.managerEntry.institutionId, approvalStatus: "PENDING", isActive: true },
      include: {
        createdBy: { include: { profile: { select: { fullName: true, email: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: lecturerProcedure
    .input(programInput)
    .mutation(async ({ ctx, input }) => {
      const { db, lecturer } = ctx;

      if (!lecturer.institutionId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be associated with an institution to create programs" });
      }

      const slug = input.slug?.trim() || generateSlug(input.title);
      const existing = await db.program.findUnique({ where: { slug } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A program with this slug already exists. Please use a different title." });
      }

      const complete = isProgramComplete(input);
      const isManager = lecturer.managedInstitutions.some(
        (m) => m.canManagePrograms && m.institutionId === lecturer.institutionId,
      );
      const approvalStatus = isManager || complete ? "APPROVED" : "PENDING";

      const program = await db.program.create({
        data: {
          ...input,
          slug,
          institutionId: lecturer.institutionId,
          createdById: lecturer.id,
          approvalStatus,
          isPublished: false,
          ...priceUsdFields(input.foreignPrice),
        },
      });

      if (approvalStatus === "PENDING") {
        const managers = await db.institutionManager.findMany({
          where: { institutionId: lecturer.institutionId, canManagePrograms: true },
          include: { lecturer: { include: { profile: true } } },
        });
        await db.notification.createMany({
          data: managers.map((m) => ({
            profileId: m.lecturer.profileId,
            title: "New Program Pending Review",
            message: `"${program.title}" has been submitted for review.`,
            type: "SYSTEM" as const,
            link: `/dashboard?tab=institution&review=${program.id}`,
          })),
        });
      }

      return { program, approvalStatus };
    }),

  update: lecturerProcedure
    .input(z.object({ id: z.string(), data: programInput }))
    .mutation(async ({ ctx, input }) => {
      const { db, lecturer } = ctx;
      const program = await db.program.findUnique({ where: { id: input.id } });

      if (!program || !program.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const isCreator = program.createdById === lecturer.id;
      const isManager = lecturer.managedInstitutions.some(
        (m) => m.canManagePrograms && m.institutionId === program.institutionId,
      );

      if (!isCreator && !isManager) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit programs you created" });
      }

      const newApprovalStatus = isManager
        ? program.approvalStatus
        : isProgramComplete(input.data) ? "PENDING" : "DRAFT";

      return db.program.update({
        where: { id: input.id },
        data: { ...input.data, approvalStatus: newApprovalStatus, ...priceUsdFields(input.data.foreignPrice) },
      });
    }),

  // FIX: added a guard that checks all courses in the program are published
  // before allowing the manager to publish the program. This prevents students
  // from enrolling and getting locked modules.
  togglePublish: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.program.findUnique({
        where: { id: input.id },
        include: {
          courses: { select: { id: true, title: true, isPublished: true } },
        },
      });

      if (!program || program.institutionId !== ctx.managerEntry.institutionId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      if (!program.isPublished && program.approvalStatus !== "APPROVED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only approved programs can be published" });
      }

      // FIX: guard — block publishing if any module is still unpublished
      if (!program.isPublished) {
        const unpublished = program.courses.filter((c) => !c.isPublished);
        if (unpublished.length > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Cannot publish: ${unpublished.length} module(s) are still unpublished: ${unpublished.map((c) => c.title).join(", ")}. Publish all modules first.`,
          });
        }

        if (program.courses.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot publish a program with no modules. Add at least one module first.",
          });
        }
      }

      return ctx.db.program.update({
        where: { id: input.id },
        data: { isPublished: !program.isPublished },
      });
    }),

  approve: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.program.findUnique({
        where: { id: input.id },
        include: { createdBy: { include: { profile: true } } },
      });

      if (!program || program.institutionId !== ctx.managerEntry.institutionId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const updated = await ctx.db.program.update({
        where: { id: input.id },
        data: { approvalStatus: "APPROVED", reviewedById: ctx.lecturer.id, reviewedAt: new Date(), reviewNote: null },
      });

      if (program.createdBy?.profileId) {
        await ctx.db.notification.create({
          data: {
            profileId: program.createdBy.profileId,
            title: "Program Approved ✅",
            message: `Your program "${program.title}" has been approved.`,
            type: "SYSTEM",
            link: `/dashboard`,
          },
        });
      }

      return updated;
    }),

  requestChanges: managerProcedure
    .input(z.object({ id: z.string(), note: z.string().min(10, "Please provide detailed feedback") }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.program.findUnique({
        where: { id: input.id },
        include: { createdBy: { include: { profile: true } } },
      });

      if (!program || program.institutionId !== ctx.managerEntry.institutionId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const updated = await ctx.db.program.update({
        where: { id: input.id },
        data: { approvalStatus: "CHANGES_REQUESTED", reviewedById: ctx.lecturer.id, reviewedAt: new Date(), reviewNote: input.note },
      });

      if (program.createdBy?.profileId) {
        await ctx.db.notification.create({
          data: {
            profileId: program.createdBy.profileId,
            title: "Changes Requested for Your Program",
            message: `"${program.title}": ${input.note}`,
            type: "SYSTEM",
            link: `/dashboard`,
          },
        });
      }

      return updated;
    }),

  delete: lecturerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, lecturer } = ctx;
      const program = await db.program.findUnique({ where: { id: input.id } });

      if (!program || !program.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      const isCreator = program.createdById === lecturer.id;
      const isManager = lecturer.managedInstitutions.some(
        (m) => m.canManagePrograms && m.institutionId === program.institutionId,
      );

      if (!isCreator && !isManager) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don\'t have permission to delete this program" });
      }

      return db.program.update({ where: { id: input.id }, data: { isActive: false, isPublished: false } });
    }),

  getInstitutionStats: managerProcedure.query(async ({ ctx }) => {
    const institutionId = ctx.managerEntry.institutionId;

    const [totalPrograms, publishedPrograms, pendingPrograms, totalLecturers, totalEnrollments] =
      await Promise.all([
        ctx.db.program.count({ where: { institutionId, isActive: true } }),
        ctx.db.program.count({ where: { institutionId, isActive: true, isPublished: true } }),
        ctx.db.program.count({ where: { institutionId, isActive: true, approvalStatus: "PENDING" } }),
        ctx.db.lecturer.count({ where: { institutionId, approvalStatus: "APPROVED" } }),
        ctx.db.enrollment.count({ where: { program: { institutionId } } }),
      ]);

    return { totalPrograms, publishedPrograms, pendingPrograms, totalLecturers, totalEnrollments };
  }),
});