import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ProgramField, type PrismaClient } from "@prisma/client";
import { createTRPCRouter, employerProcedure } from "~/server/api/trpc";
import { classifyFieldOfStudy } from "~/lib/taxonomy/studentFieldMapping";

const JOB_TYPE_VALUES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "OVERSEAS"] as const;
const WORK_MODEL_VALUES = ["ON_SITE", "HYBRID", "REMOTE"] as const;

const candidateSearchInput = z.object({
  jobId: z.string().min(1),
  search: z.string().trim().max(200).optional(),
  employmentTypes: z.array(z.enum(JOB_TYPE_VALUES)).default([]),
  workModels: z.array(z.enum(WORK_MODEL_VALUES)).default([]),
  fieldsOfStudy: z.array(z.nativeEnum(ProgramField)).default([]),
  verifiedOnly: z.boolean().default(false),
  hasPublishedResearch: z.boolean().default(false),
  hasCredentials: z.boolean().default(false),
  minGpa: z.string().optional(),
  gradYear: z.number().int().optional(),
  minMatchScore: z.number().int().min(0).max(100).default(0),
  sortBy: z.enum(["match", "gpa", "gradYear"]).default("match"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

// ── Ownership / eligibility check — mirrors job.ts's ownership pattern ──────
// Shared by search + invite so an employer can never target a job they
// don't own, or one that isn't published yet.
async function getOwnedPublishedJob(db: PrismaClient, jobId: string, employerId: string) {
  const job = await db.jobListing.findUnique({ where: { id: jobId } });

  if (job?.employerId !== employerId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job listing not found" });
  }
  if (job.status !== "PUBLISHED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Select a published job listing" });
  }

  return job;
}

// ── Match score ──────────────────────────────────────────────────────────
// See the Architecture Plan for the exact weighting: up to 60 points for
// keyword overlap between the job's preferredFields/requiredQualifications
// and the candidate's fieldOfStudy/degreeProgram/skills, up to 20 for an
// employment-type preference match, up to 20 for a work-model preference
// match. Each component only contributes to maxScore when it's actually
// applicable, so a job/candidate pair with no signal at all scores 0
// instead of being penalized as 0/100.
function computeMatchScore(
  candidate: {
    fieldOfStudy: string | null;
    degreeProgram: string | null;
    skills: string[];
    employmentTypePreference: string[];
    workModelPreference: string[];
  },
  job: {
    preferredFields: string[];
    requiredQualifications: string[];
    type: string;
    workModel: string | null;
  },
): number {
  let score = 0;
  let maxScore = 0;

  const jobKeywords = Array.from(
    new Set(
      [...job.preferredFields, ...job.requiredQualifications]
        .map((k) => k.toLowerCase().trim())
        .filter(Boolean),
    ),
  );

  if (jobKeywords.length > 0) {
    const candidateText = [candidate.fieldOfStudy, candidate.degreeProgram, ...candidate.skills]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchedCount = jobKeywords.filter((kw) => candidateText.includes(kw)).length;
    score += (matchedCount / jobKeywords.length) * 60;
    maxScore += 60;
  }

  if (candidate.employmentTypePreference.length > 0) {
    score += candidate.employmentTypePreference.includes(job.type) ? 20 : 0;
    maxScore += 20;
  }

  if (job.workModel && candidate.workModelPreference.length > 0) {
    score += candidate.workModelPreference.includes(job.workModel) ? 20 : 0;
    maxScore += 20;
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

export const candidateRouter = createTRPCRouter({
  search: employerProcedure.input(candidateSearchInput).query(async ({ ctx, input }) => {
    const job = await getOwnedPublishedJob(ctx.db, input.jobId, ctx.employer.id);

    // Visibility gate first — only students who opted into a public
    // profile are eligible at all, before any other filter is applied.
    const students = await ctx.db.student.findMany({
      where: { studentPublicProfile: { isPublic: true } },
      select: {
        id: true,
        fieldOfStudy: true,
        institute: true,
        degreeProgram: true,
        yearOrGrade: true,
        expectedGraduationDate: true,
        gpa: true,
        employmentTypePreference: true,
        workModelPreference: true,
        availability: true,
        profile: {
          select: { fullName: true, avatarUrl: true, isVerified: true },
        },
        studentPublicProfile: {
          select: { shareToken: true, tagline: true, location: true },
        },
        recommendationProfile: { select: { skills: true } },
        researchPapers: { where: { status: "PUBLISHED" }, select: { id: true } },
        credentials: { where: { isValid: true }, select: { id: true } },
      },
    });

    // ── Shape into the candidate pool with computed fields ────────────────
    const pool = students.map((s) => {
      const skills = s.recommendationProfile?.skills ?? [];
      const classifiedField = classifyFieldOfStudy(s.fieldOfStudy);
      const matchScore = computeMatchScore(
        {
          fieldOfStudy: s.fieldOfStudy,
          degreeProgram: s.degreeProgram,
          skills,
          employmentTypePreference: s.employmentTypePreference,
          workModelPreference: s.workModelPreference,
        },
        {
          preferredFields: job.preferredFields,
          requiredQualifications: job.requiredQualifications,
          type: job.type,
          workModel: job.workModel,
        },
      );

      return {
        studentId: s.id,
        fullName: s.profile.fullName,
        avatarUrl: s.profile.avatarUrl,
        isVerified: s.profile.isVerified,
        tagline: s.studentPublicProfile?.tagline ?? null,
        location: s.studentPublicProfile?.location ?? null,
        shareToken: s.studentPublicProfile?.shareToken ?? null,
        institute: s.institute,
        fieldOfStudy: s.fieldOfStudy,
        classifiedField,
        degreeProgram: s.degreeProgram,
        yearOrGrade: s.yearOrGrade,
        expectedGraduationDate: s.expectedGraduationDate,
        gpa: s.gpa,
        skills,
        employmentTypePreference: s.employmentTypePreference,
        workModelPreference: s.workModelPreference,
        availability: s.availability,
        papersCount: s.researchPapers.length,
        credentialsCount: s.credentials.length,
        matchScore,
      };
    });

    // ── Facets — computed from the post-visibility-gate pool, before any
    // other filter is applied ────────────────────────────────────────────
    const employmentTypeFacets = Object.fromEntries(
      JOB_TYPE_VALUES.map((t) => [
        t,
        pool.filter((c) => c.employmentTypePreference.includes(t)).length,
      ]),
    ) as Record<(typeof JOB_TYPE_VALUES)[number], number>;

    const workModelFacets = Object.fromEntries(
      WORK_MODEL_VALUES.map((m) => [
        m,
        pool.filter((c) => c.workModelPreference.includes(m)).length,
      ]),
    ) as Record<(typeof WORK_MODEL_VALUES)[number], number>;

    const fieldOfStudyCounts = new Map<ProgramField, number>();
    for (const c of pool) {
      if (!c.classifiedField) continue;
      fieldOfStudyCounts.set(c.classifiedField, (fieldOfStudyCounts.get(c.classifiedField) ?? 0) + 1);
    }
    const fieldsOfStudyFacets = Array.from(fieldOfStudyCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([field, count]) => ({ field, count }));

    const facets = {
      employmentTypes: employmentTypeFacets,
      workModels: workModelFacets,
      fieldsOfStudy: fieldsOfStudyFacets,
    };

    // ── Filters ─────────────────────────────────────────────────────────
    let filtered = pool;

    if (input.search) {
      const q = input.search.toLowerCase();
      filtered = filtered.filter((c) => {
        const haystack = [c.fullName, c.fieldOfStudy, c.degreeProgram, c.institute, ...c.skills]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (input.employmentTypes.length > 0) {
      filtered = filtered.filter((c) =>
        c.employmentTypePreference.some((t) => input.employmentTypes.includes(t)),
      );
    }

    if (input.workModels.length > 0) {
      filtered = filtered.filter((c) =>
        c.workModelPreference.some((m) => input.workModels.includes(m)),
      );
    }

    if (input.fieldsOfStudy.length > 0) {
      filtered = filtered.filter(
        (c) => c.classifiedField !== null && input.fieldsOfStudy.includes(c.classifiedField),
      );
    }

    if (input.verifiedOnly) {
      filtered = filtered.filter((c) => c.isVerified);
    }

    if (input.hasPublishedResearch) {
      filtered = filtered.filter((c) => c.papersCount > 0);
    }

    if (input.hasCredentials) {
      filtered = filtered.filter((c) => c.credentialsCount > 0);
    }

    if (input.minGpa) {
      const minGpaNum = parseFloat(input.minGpa);
      if (!isNaN(minGpaNum)) {
        filtered = filtered.filter((c) => {
          const candidateGpa = c.gpa ? parseFloat(c.gpa) : NaN;
          return !isNaN(candidateGpa) && candidateGpa >= minGpaNum;
        });
      }
    }

    if (input.gradYear) {
      filtered = filtered.filter(
        (c) => c.expectedGraduationDate?.getFullYear() === input.gradYear,
      );
    }

    if (input.minMatchScore > 0) {
      filtered = filtered.filter((c) => c.matchScore >= input.minMatchScore);
    }

    // ── Sort ────────────────────────────────────────────────────────────
    const sorted = [...filtered];
    if (input.sortBy === "match") {
      sorted.sort((a, b) => b.matchScore - a.matchScore);
    } else if (input.sortBy === "gpa") {
      sorted.sort((a, b) => {
        const aGpa = a.gpa ? parseFloat(a.gpa) : NaN;
        const bGpa = b.gpa ? parseFloat(b.gpa) : NaN;
        const aValid = !isNaN(aGpa);
        const bValid = !isNaN(bGpa);
        if (aValid && bValid) return bGpa - aGpa;
        if (aValid) return -1;
        if (bValid) return 1;
        return 0;
      });
    } else {
      sorted.sort((a, b) => {
        const aYear = a.expectedGraduationDate?.getFullYear() ?? null;
        const bYear = b.expectedGraduationDate?.getFullYear() ?? null;
        if (aYear !== null && bYear !== null) return aYear - bYear;
        if (aYear !== null) return -1;
        if (bYear !== null) return 1;
        return 0;
      });
    }

    // ── Paginate ────────────────────────────────────────────────────────
    const total = sorted.length;
    const start = (input.page - 1) * input.pageSize;
    const page = sorted.slice(start, start + input.pageSize);

    // ── Explicit allowlist — never leak PII beyond what's listed here ─────
    const results = page.map((c) => ({
      studentId: c.studentId,
      fullName: c.fullName,
      avatarUrl: c.avatarUrl,
      isVerified: c.isVerified,
      tagline: c.tagline,
      location: c.location,
      institute: c.institute,
      fieldOfStudy: c.fieldOfStudy,
      degreeProgram: c.degreeProgram,
      yearOrGrade: c.yearOrGrade,
      expectedGraduationDate: c.expectedGraduationDate,
      gpa: c.gpa,
      skills: c.skills,
      employmentTypePreference: c.employmentTypePreference,
      workModelPreference: c.workModelPreference,
      availability: c.availability,
      papersCount: c.papersCount,
      credentialsCount: c.credentialsCount,
      matchScore: c.matchScore,
      shareToken: c.shareToken,
    }));

    return { results, total, page: input.page, pageSize: input.pageSize, facets };
  }),

  invite: employerProcedure
    .input(z.object({ studentId: z.string().min(1), jobId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const job = await getOwnedPublishedJob(ctx.db, input.jobId, ctx.employer.id);

      // Re-fetch + re-check visibility server-side — never trust the
      // client's search results. Fail closed with the same generic
      // NOT_FOUND used by studentProfile.getPublicProfile.
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: { studentPublicProfile: true, profile: true },
      });

      if (student?.studentPublicProfile?.isPublic !== true) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.notification.create({
        data: {
          profileId: student.profile.id,
          title: `${ctx.employer.companyName} invited you to apply`,
          message: `You've been invited to apply for "${job.title}" at ${ctx.employer.companyName}.`,
          type: "JOB",
          link: "/dashboard/student/careers",
        },
      });

      return { success: true };
    }),
});
