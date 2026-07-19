import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  INTEREST_CATEGORIES,
  CAREER_GOALS,
  SKILL_LEVELS,
  DELIVERY_MODES,
  BUDGET_TIERS,
} from "~/lib/taxonomy/programTaxonomy";
import { getRegionForCountry } from "~/lib/taxonomy/regionTaxonomy";
import { PROGRAM_MODE_TO_TAXONOMY_MODE } from "~/lib/taxonomy/programFieldMapping";
import { passesHardFilters } from "~/lib/recommendation/hardFilters";
import { scoreProgram } from "~/lib/recommendation/scoring";

const MAX_RECOMMENDATIONS = 20;

// ── Zod validators ─────────────────────────────────────────────────────────

const interestIds = INTEREST_CATEGORIES.map((c) => c.id) as [string, ...string[]];
const careerGoalIds = CAREER_GOALS.map((g) => g.id) as [string, ...string[]];
const skillLevelValues = [...SKILL_LEVELS] as [string, ...string[]];
const deliveryModeValues = [...DELIVERY_MODES] as [string, ...string[]];
const budgetTierIds = BUDGET_TIERS.map((b) => b.id) as [string, ...string[]];

// All recommendation fields are optional so partial saves from skipped steps work
const upsertProfileInput = z.object({
  interests:     z.array(z.enum(interestIds)).max(8).optional().default([]),
  careerGoals:   z.array(z.enum(careerGoalIds)).max(5).optional().default([]),
  skillLevel:    z.enum(skillLevelValues).optional(),
  preferredMode: z.enum(deliveryModeValues).optional(),
  budgetTierId:  z.enum(budgetTierIds).optional(),
  countryCode:   z.string().length(2).toUpperCase().optional(),
});

// ── Helper ─────────────────────────────────────────────────────────────────

function buildProfileText(data: z.infer<typeof upsertProfileInput>): string {
  const interestLabels = (data.interests ?? [])
    .map((id) => INTEREST_CATEGORIES.find((c) => c.id === id)?.label ?? id)
    .join(", ");
  const careerLabels = (data.careerGoals ?? [])
    .map((id) => CAREER_GOALS.find((g) => g.id === id)?.label ?? id)
    .join(", ");
  return [
    interestLabels  && `Interests: ${interestLabels}.`,
    careerLabels    && `Career goals: ${careerLabels}.`,
    data.skillLevel    && `Skill level: ${data.skillLevel}.`,
    data.preferredMode && `Preferred delivery mode: ${data.preferredMode}.`,
  ].filter(Boolean).join(" ");
}

// Whether all six steps are complete — used to set quizCompletedAt
function isFullyComplete(data: z.infer<typeof upsertProfileInput>): boolean {
  return (
    (data.interests?.length ?? 0) > 0 &&
    !!data.skillLevel &&
    !!data.preferredMode &&
    !!data.budgetTierId &&
    !!data.countryCode
  );
}

// ── Router ─────────────────────────────────────────────────────────────────

export const studentProfileRouter = createTRPCRouter({

  // Used by dashboard banner — returns per-step completion booleans
  getProfileStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.profile.role !== "STUDENT") {
      return { completed: false, required: false, completedSteps: [] as boolean[] };
    }

    const student = await ctx.db.student.findUnique({
      where: { profileId: ctx.profile.id },
      select: {
        id: true,
        previousEducation: true,
        employmentStatus: true,
      },
    });

    if (!student) {
      return { completed: false, required: false, completedSteps: [] as boolean[] };
    }

    const rec = await ctx.db.studentProfile.findUnique({
      where: { studentId: student.id },
      select: {
        interests: true,
        careerGoals: true,
        skillLevel: true,
        preferredMode: true,
        budgetTierId: true,
        countryCode: true,
      },
    });

    const profile = ctx.profile;

    const completedSteps: boolean[] = [
      !!(profile.phone || profile.dateOfBirth || profile.gender || profile.city || profile.district),
      !!(student.previousEducation || student.employmentStatus),
      (rec?.interests?.length ?? 0) > 0,
      (rec?.careerGoals?.length ?? 0) > 0,
      !!(rec?.skillLevel && rec?.preferredMode && rec?.budgetTierId),
      !!rec?.countryCode,
    ];

    const allComplete = completedSteps.every(Boolean);

    return {
      completed: allComplete,
      required: true,
      completedSteps,
    };
  }),

  // Returns all existing data to prepopulate the setup form on return visits
  getMyFullProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.profile.role !== "STUDENT") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Students only" });
    }

    const student = await ctx.db.student.findUnique({
      where: { profileId: ctx.profile.id },
      select: {
        id: true,
        previousEducation: true,
        employmentStatus: true,
      },
    });

    // Return empty defaults if student record not yet created
    if (!student) {
      return {
        phone: "", dateOfBirth: "", gender: "", city: "", district: "",
        educationLevel: "", employmentStatus: "",
        interests: [] as string[], careerGoals: [] as string[],
        skillLevel: "", preferredMode: "", budgetTierId: "", countryCode: "",
      };
    }

    const rec = await ctx.db.studentProfile.findUnique({
      where: { studentId: student.id },
      select: {
        interests: true,
        careerGoals: true,
        skillLevel: true,
        preferredMode: true,
        budgetTierId: true,
        countryCode: true,
      },
    });

    return {
      phone:           ctx.profile.phone ?? "",
      dateOfBirth:     ctx.profile.dateOfBirth
        ? new Date(ctx.profile.dateOfBirth).toISOString().split("T")[0]!
        : "",
      gender:          ctx.profile.gender ?? "",
      city:            ctx.profile.city ?? "",
      district:        ctx.profile.district ?? "",
      educationLevel:  student.previousEducation ?? "",
      employmentStatus: student.employmentStatus ?? "",
      interests:       (rec?.interests ?? []) as string[],
      careerGoals:     (rec?.careerGoals ?? []) as string[],
      skillLevel:      rec?.skillLevel ?? "",
      preferredMode:   rec?.preferredMode ?? "",
      budgetTierId:    rec?.budgetTierId ?? "",
      countryCode:     rec?.countryCode ?? "",
    };
  }),

  // Saves whatever recommendation fields exist — partial saves are valid
  upsertProfile: protectedProcedure
    .input(upsertProfileInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.profile.role !== "STUDENT") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Students only" });
      }

      const student = await ctx.db.student.findUnique({
        where: { profileId: ctx.profile.id },
        select: { id: true },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student record not found.",
        });
      }

      const region = input.countryCode
        ? getRegionForCountry(input.countryCode)
        : null;

      const profileText = buildProfileText(input);
      const fullyComplete = isFullyComplete(input);

      // Only fields that were actually provided get written.
      // Undefined fields are excluded from the update so previously
      // saved values from other steps are never overwritten with nulls.
      const writeData = {
        ...(input.interests     !== undefined && { interests:     input.interests }),
        ...(input.careerGoals   !== undefined && { careerGoals:   input.careerGoals }),
        ...(input.skillLevel    !== undefined && { skillLevel:    input.skillLevel }),
        ...(input.preferredMode !== undefined && { preferredMode: input.preferredMode }),
        ...(input.budgetTierId  !== undefined && { budgetTierId:  input.budgetTierId }),
        ...(input.countryCode   !== undefined && { countryCode:   input.countryCode, region }),
        ...(profileText && { profileText }),
        embeddingUpdatedAt: null,
        ...(fullyComplete && { quizCompletedAt: new Date() }),
      };

      const rec = await ctx.db.studentProfile.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
          interests:     input.interests     ?? [],
          careerGoals:   input.careerGoals   ?? [],
          skillLevel:    input.skillLevel    ?? null,
          preferredMode: input.preferredMode ?? null,
          budgetTierId:  input.budgetTierId  ?? null,
          countryCode:   input.countryCode   ?? null,
          region:        region ?? null,
          profileText:   profileText || "",
          quizCompletedAt: fullyComplete ? new Date() : null,
        },
        update: writeData,
      });

      return { success: true, profileId: rec.id };
    }),

  // Resets recommendation profile
  resetProfile: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.profile.role !== "STUDENT") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Students only" });
    }

    const student = await ctx.db.student.findUnique({
      where: { profileId: ctx.profile.id },
      select: { id: true },
    });

    if (!student) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
    }

    await ctx.db.studentProfile.deleteMany({
      where: { studentId: student.id },
    });

    return { success: true };
  }),

  // Ranked program matches for the current student, based on their
  // recommendation profile. Returns profileIncomplete: true when the quiz
  // hasn't been started yet so the UI can prompt a return to /profile-setup.
  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.profile.role !== "STUDENT") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Students only" });
    }

    const student = await ctx.db.student.findUnique({
      where: { profileId: ctx.profile.id },
      select: { id: true },
    });

    if (!student) {
      return { recommendations: [], profileIncomplete: true };
    }

    const rec = await ctx.db.studentProfile.findUnique({
      where: { studentId: student.id },
    });

    if (!rec || rec.interests.length === 0) {
      return { recommendations: [], profileIncomplete: true };
    }

    const budgetTier = BUDGET_TIERS.find((b) => b.id === rec.budgetTierId);

    const candidates = await ctx.db.program.findMany({
      where: { isPublished: true, isActive: true, approvalStatus: "APPROVED" },
      include: {
        institution: {
          select: { id: true, name: true, city: true, country: true, isVerified: true, logoUrl: true },
        },
        courses: { select: { id: true }, where: { isPublished: true } },
      },
    });

    const filterContext = {
      countryCode: rec.countryCode,
      budgetTierMaxUsd: budgetTier?.maxUsd ?? null,
      preferredMode: rec.preferredMode,
      skillLevel: rec.skillLevel,
    };

    const scored = candidates
      .filter((program) =>
        passesHardFilters(filterContext, {
          id: program.id,
          acceptsInternational: program.acceptsInternational,
          restrictedRegions: program.restrictedRegions,
          priceUsd: program.priceUsd,
          deliveryMode: PROGRAM_MODE_TO_TAXONOMY_MODE[program.deliveryMode] ?? null,
          minSkillLevel: null,
        }),
      )
      .map((program) => ({
        program,
        score: scoreProgram(
          { interests: rec.interests, careerGoals: rec.careerGoals },
          { field: program.field, interestTags: program.interestTags },
        ),
      }))
      // Hard filters only establish eligibility (region/budget/mode) — a
      // "recommendation" additionally requires genuine interest/career
      // relevance, so mode-only matches (isRelevant: false) are dropped.
      .filter(({ score }) => score.isRelevant)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, MAX_RECOMMENDATIONS);

    if (scored.length > 0) {
      await ctx.db.recommendationInteraction.createMany({
        data: scored.map(({ program, score }, index) => ({
          studentId: student.id,
          programId: program.id,
          action: "SHOWN",
          rankPosition: index + 1,
          score: score.total,
        })),
      });
    }

    return {
      recommendations: scored.map(({ program, score }) => ({ ...program, matchScore: score.total })),
      profileIncomplete: false,
    };
  }),

  // Records a click on a recommended program, alongside the rank/score it
  // was shown with — lets future tuning compare click-through against
  // the "SHOWN" rows already logged by getRecommendations.
  logInteraction: protectedProcedure
    .input(z.object({
      programId: z.string(),
      action: z.literal("CLICKED"),
      rankPosition: z.number().int().positive().optional(),
      score: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.profile.role !== "STUDENT") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Students only" });
      }

      const student = await ctx.db.student.findUnique({
        where: { profileId: ctx.profile.id },
        select: { id: true },
      });

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
      }

      await ctx.db.recommendationInteraction.create({
        data: {
          studentId: student.id,
          programId: input.programId,
          action: input.action,
          rankPosition: input.rankPosition ?? null,
          score: input.score ?? null,
        },
      });

      return { success: true };
    }),
});