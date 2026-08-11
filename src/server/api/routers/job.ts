import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { JobType } from "@prisma/client";
import {
  createTRPCRouter,
  employerProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const jobListingInput = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  department: z.string().optional().nullable(),
  numberOfOpenings: z.number().int().positive().optional().nullable(),
  description: z.string().min(20, "Please provide a role description"),
  type: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "OVERSEAS"]),
  workModel: z.enum(["ON_SITE", "HYBRID", "REMOTE"]).optional().nullable(),
  location: z.string().optional().nullable(),
  experienceLevel: z.enum(["ENTRY_LEVEL", "JUNIOR", "MID_LEVEL", "SENIOR_LEVEL", "EXECUTIVE"]).optional().nullable(),
  minimumEducation: z.enum(["HIGH_SCHOOL", "DIPLOMA", "BACHELOR", "MASTER", "PHD", "NOT_REQUIRED"]).optional().nullable(),
  requiredQualifications: z.array(z.string()).default([]),
  preferredFields: z.array(z.string()).default([]),
  requirements: z.string().optional().nullable(),
  salaryMin: z.number().positive().optional().nullable(),
  salaryMax: z.number().positive().optional().nullable(),
  displaySalaryPublicly: z.boolean().default(true),
  applicationDeadline: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
}).refine(
  (d) => !(d.salaryMin && d.salaryMax) || d.salaryMin <= d.salaryMax,
  { message: "Minimum salary cannot exceed maximum salary", path: ["salaryMin"] },
).refine(
  (d) => !d.applicationDeadline || new Date(d.applicationDeadline) > new Date(),
  { message: "Application deadline must be in the future", path: ["applicationDeadline"] },
);

export const jobRouter = createTRPCRouter({

  listPublic: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      type: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.jobListing.findMany({
        where: {
          status: "PUBLISHED",
          isActive: true,
          ...(input.search && {
            title: { contains: input.search, mode: "insensitive" },
          }),
          ...(input.type && { type: input.type as JobType }),
        },
        include: {
          employer: { select: { companyName: true, logoUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getMyListings: employerProcedure.query(async ({ ctx }) => {
    return ctx.db.jobListing.findMany({
      where: { employerId: ctx.employer.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: employerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.jobListing.findUnique({ where: { id: input.id } });

      if (job?.employerId !== ctx.employer.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job listing not found" });
      }

      return job;
    }),

  create: employerProcedure
    .input(jobListingInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.jobListing.create({
        data: {
          ...input,
          employerId: ctx.employer.id,
          isRemote: input.workModel === "REMOTE",
        },
      });
    }),

  update: employerProcedure
    .input(z.object({ id: z.string(), data: jobListingInput }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.jobListing.findUnique({ where: { id: input.id } });

      if (job?.employerId !== ctx.employer.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job listing not found" });
      }

      return ctx.db.jobListing.update({
        where: { id: input.id },
        data: {
          ...input.data,
          isRemote: input.data.workModel === "REMOTE",
        },
      });
    }),

  togglePublish: employerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.jobListing.findUnique({ where: { id: input.id } });

      if (job?.employerId !== ctx.employer.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job listing not found" });
      }

      return ctx.db.jobListing.update({
        where: { id: input.id },
        data: { status: job.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
      });
    }),

  delete: employerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.jobListing.findUnique({ where: { id: input.id } });

      if (job?.employerId !== ctx.employer.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job listing not found" });
      }

      return ctx.db.jobListing.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});
