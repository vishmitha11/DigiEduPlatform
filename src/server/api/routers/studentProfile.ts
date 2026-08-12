import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  INTEREST_CATEGORIES,
  CAREER_GOALS,
  SKILL_LEVELS,
  DELIVERY_MODES,
  BUDGET_TIERS,
  CONTRIBUTION_GOALS,
  OPPORTUNITY_INTERESTS,
} from "~/lib/taxonomy/programTaxonomy";
import { getRegionForCountry } from "~/lib/taxonomy/regionTaxonomy";
import { PROGRAM_MODE_TO_TAXONOMY_MODE } from "~/lib/taxonomy/programFieldMapping";
import { passesHardFilters } from "~/lib/recommendation/hardFilters";
import { scoreProgram } from "~/lib/recommendation/scoring";

const MAX_RECOMMENDATIONS = 20;

// ── Recommendation-quiz Zod validators ──────────────────────────────────────

const interestIds = INTEREST_CATEGORIES.map((c) => c.id) as [string, ...string[]];
const careerGoalIds = CAREER_GOALS.map((g) => g.id) as [string, ...string[]];
const skillLevelValues = [...SKILL_LEVELS] as [string, ...string[]];
const deliveryModeValues = [...DELIVERY_MODES] as [string, ...string[]];
const budgetTierIds = BUDGET_TIERS.map((b) => b.id) as [string, ...string[]];
const contributionGoalIds = CONTRIBUTION_GOALS.map((g) => g.id) as [string, ...string[]];
const opportunityInterestIds = OPPORTUNITY_INTERESTS.map((o) => o.id) as [string, ...string[]];

// All recommendation fields are optional so partial saves from skipped steps work
const upsertRecommendationProfileInput = z.object({
  interests:     z.array(z.enum(interestIds)).max(8).optional().default([]),
  careerGoals:   z.array(z.enum(careerGoalIds)).max(5).optional().default([]),
  skillLevel:    z.enum(skillLevelValues).optional(),
  preferredMode: z.enum(deliveryModeValues).optional(),
  budgetTierId:  z.enum(budgetTierIds).optional(),
  countryCode:   z.string().length(2).toUpperCase().optional(),
  // Profile-personalization data — stored/displayed only, not scored.
  contributionGoals:    z.array(z.enum(contributionGoalIds)).max(3).optional(),
  opportunityInterests: z.array(z.enum(opportunityInterestIds)).optional(),
  skills:                z.array(z.string().min(1).max(40)).max(20).optional(),
});

// ── Recommendation-quiz helpers ──────────────────────────────────────────────

function buildProfileText(data: z.infer<typeof upsertRecommendationProfileInput>): string {
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
function isFullyComplete(data: z.infer<typeof upsertRecommendationProfileInput>): boolean {
  return (
    (data.interests?.length ?? 0) > 0 &&
    !!data.skillLevel &&
    !!data.preferredMode &&
    !!data.budgetTierId &&
    !!data.countryCode
  );
}

// ── Public-profile helper: get student record for current user ─────────────
async function getStudent(db: PrismaClient, profileId: string) {
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

// ── Public-profile visibility JSON shape ────────────────────────────────────
const VISIBILITY_KEYS = [
  "header",
  "journey",
  "education",
  "currentInstitute",
  "researchPapers",
  "programs",
  "sidebar",
] as const;

type VisibilityKey = (typeof VISIBILITY_KEYS)[number];

const visibilityInputSchema = z.object({
  header: z.boolean(),
  journey: z.boolean(),
  education: z.boolean(),
  currentInstitute: z.boolean(),
  researchPapers: z.boolean(),
  programs: z.boolean(),
  sidebar: z.boolean(),
});

const DEFAULT_OWNER_VISIBILITY: Record<VisibilityKey, boolean> =
  Object.fromEntries(VISIBILITY_KEYS.map((k) => [k, true])) as Record<
    VisibilityKey,
    boolean
  >;

// Fail closed: any missing/malformed key resolves to false.
function normalizeVisibility(raw: unknown): Record<VisibilityKey, boolean> {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const result = {} as Record<VisibilityKey, boolean>;
  for (const key of VISIBILITY_KEYS) {
    result[key] = obj[key] === true;
  }
  return result;
}

// ── Shared Prisma include shape for student detail data ───────────────────
// Used by both getMyProfile (owner, unfiltered) and getPublicProfile
// (visitor, filtered) so the journey/institute/progress helpers below can
// operate on a single consistent shape.
function studentDetailInclude() {
  return {
    profile: true,
    researchPapers: { orderBy: { createdAt: "desc" as const } },
    credentials: true,
    jobApplications: true,
    enrollments: {
      where: { status: { not: "WITHDRAWN" as const } },
      orderBy: { createdAt: "desc" as const },
      include: {
        program: {
          include: {
            institution: true,
            courses: { select: { id: true } },
          },
        },
      },
    },
    courseEnrollments: {
      include: {
        course: {
          include: {
            sections: {
              include: { resources: { select: { id: true } } },
            },
          },
        },
      },
    },
    resourceProgress: { select: { resourceId: true } },
  } satisfies Prisma.StudentInclude;
}

type StudentDetail = Prisma.StudentGetPayload<{
  include: ReturnType<typeof studentDetailInclude>;
}>;

type StudentEnrollment = StudentDetail["enrollments"][number];

// Explicit return-type interfaces for the computed helpers below. These
// keep the tRPC-inferred client type concrete and shallow instead of
// leaking the full recursive Prisma.StudentGetPayload generic (which can
// otherwise widen to `any` for deeply nested consumers on the client).
interface JourneyStage {
  key: string;
  label: string;
  reached: boolean;
  placeholder: boolean;
}

interface CurrentInstituteSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  country: string;
  programTitle: string;
  enrollmentStatus: string;
}

interface EducationEnrollmentSummary {
  id: string;
  programTitle: string;
  level: string;
  field: string;
  institution: string | null;
  status: string;
  isCompleted: boolean;
  year: number | null;
}

interface EducationCredentialSummary {
  id: string;
  title: string;
  credentialType: string;
  issuedBy: string | null;
  isValid: boolean;
  year: number | null;
}

interface EducationSummary {
  enrollments: EducationEnrollmentSummary[];
  credentials: EducationCredentialSummary[];
}

interface ProgramSummary {
  enrollmentId: string;
  programId: string;
  title: string;
  type: string;
  level: string;
  field: string;
  status: string;
  institution: { id: string; name: string; logoUrl: string | null } | null;
  totalCourses: number;
  completedCourses: number;
  progressPercent: number;
}

interface CourseSummary {
  courseEnrollmentId: string;
  courseId: string;
  title: string;
  status: string;
  totalResources: number;
  completedResources: number;
  progressPercent: number;
}

// ── Journey stage computation ──────────────────────────────────────────────
// Shared by getMyProfile and getPublicProfile.
function computeJourneyStages(student: StudentDetail): JourneyStage[] {
  const learnAndGrow =
    student.enrollments.length > 0 ||
    student.courseEnrollments.length > 0 ||
    student.resourceProgress.length > 0;

  const applyAndExperience = student.jobApplications.length > 0;

  const getRecognized =
    student.credentials.some((c) => c.isValid) ||
    student.courseEnrollments.some(
      (ce) => ce.status === "COMPLETED" && ce.grade != null,
    );

  return [
    { key: "discover", label: "Discover", reached: true, placeholder: false },
    {
      key: "learnAndGrow",
      label: "Learn & Grow",
      reached: learnAndGrow,
      placeholder: false,
    },
    {
      key: "applyAndExperience",
      label: "Apply & Experience",
      reached: applyAndExperience,
      placeholder: false,
    },
    {
      key: "getRecognized",
      label: "Get Recognized",
      reached: getRecognized,
      placeholder: false,
    },
    {
      key: "leadAndInspire",
      label: "Lead & Inspire",
      reached: false,
      placeholder: true,
    },
  ];
}

// ── Current institute computation ──────────────────────────────────────────
// Shared by getMyProfile and getPublicProfile.
const ENROLLMENT_STATUS_RANK: Record<string, number> = {
  ACTIVE: 3,
  APPROVED: 2,
  COMPLETED: 1,
};

function computeCurrentInstitute(
  enrollments: StudentEnrollment[],
): CurrentInstituteSummary | null {
  const eligible = enrollments.filter(
    (e) => ENROLLMENT_STATUS_RANK[e.status] !== undefined,
  );
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    const rankDiff =
      (ENROLLMENT_STATUS_RANK[b.status] ?? 0) -
      (ENROLLMENT_STATUS_RANK[a.status] ?? 0);
    if (rankDiff !== 0) return rankDiff;
    const aTime = new Date(a.enrollmentDate ?? a.createdAt).getTime();
    const bTime = new Date(b.enrollmentDate ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  const top = sorted[0]!;
  const institution = top.program.institution;
  if (!institution) return null;

  return {
    id: institution.id,
    name: institution.name,
    logoUrl: institution.logoUrl,
    city: institution.city,
    country: institution.country,
    programTitle: top.program.title,
    enrollmentStatus: top.status,
  };
}

// ── Education status summary ───────────────────────────────────────────────
function getYear(d: Date | string | null | undefined): number | null {
  return d ? new Date(d).getFullYear() : null;
}

function buildEducationSummary(student: StudentDetail): EducationSummary {
  const enrollments = student.enrollments.map((e) => ({
    id: e.id,
    programTitle: e.program.title,
    level: e.program.level,
    field: e.program.field,
    institution: e.program.institution?.name ?? null,
    status: e.status,
    isCompleted: e.status === "COMPLETED",
    year: getYear(
      e.actualCompletion ?? e.expectedCompletion ?? e.enrollmentDate ?? e.createdAt,
    ),
  }));

  const credentials = student.credentials.map((c) => ({
    id: c.id,
    title: c.title,
    credentialType: c.credentialType,
    issuedBy: c.issuedBy,
    isValid: c.isValid,
    year: getYear(c.issueDate),
  }));

  return { enrollments, credentials };
}

// ── Program / course progress summary ──────────────────────────────────────
function buildProgramsAndCourses(
  student: StudentDetail,
): { programs: ProgramSummary[]; courses: CourseSummary[] } {
  const completedResourceIds = new Set(
    student.resourceProgress.map((rp) => rp.resourceId),
  );

  const programs = student.enrollments.map((e) => {
    const totalCourses = e.program.courses.length;
    const completedCourses = student.courseEnrollments.filter(
      (ce) => ce.enrollmentId === e.id && ce.status === "COMPLETED",
    ).length;
    const progressPercent =
      totalCourses > 0
        ? Math.round((completedCourses / totalCourses) * 100)
        : 0;

    return {
      enrollmentId: e.id,
      programId: e.programId,
      title: e.program.title,
      type: e.program.type,
      level: e.program.level,
      field: e.program.field,
      status: e.status,
      institution: e.program.institution
        ? {
            id: e.program.institution.id,
            name: e.program.institution.name,
            logoUrl: e.program.institution.logoUrl,
          }
        : null,
      totalCourses,
      completedCourses,
      progressPercent,
    };
  });

  const courses = student.courseEnrollments
    .filter((ce) => ce.course.isStandalone)
    .map((ce) => {
      const allResources = ce.course.sections.flatMap((sec) => sec.resources);
      const totalResources = allResources.length;
      const completedResources = allResources.filter((r) =>
        completedResourceIds.has(r.id),
      ).length;
      const progressPercent =
        totalResources > 0
          ? Math.round((completedResources / totalResources) * 100)
          : 0;

      return {
        courseEnrollmentId: ce.id,
        courseId: ce.courseId,
        title: ce.course.title,
        status: ce.status,
        totalResources,
        completedResources,
        progressPercent,
      };
    });

  return { programs, courses };
}

// ── Router ─────────────────────────────────────────────────────────────────

export const studentProfileRouter = createTRPCRouter({

  // ── Recommendation quiz: dashboard banner completion status ─────────────
  getProfileStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.profile.role !== "STUDENT") {
      return { completed: false, required: false, completedSteps: [] as boolean[] };
    }

    // Single round trip via the relation instead of two sequential
    // findUnique calls — the second one only ever depended on the first's
    // id, so there was nothing to gain from keeping them separate.
    const student = await ctx.db.student.findUnique({
      where: { profileId: ctx.profile.id },
      select: {
        previousEducation: true,
        employmentStatus: true,
        recommendationProfile: {
          select: {
            interests: true,
            careerGoals: true,
            skillLevel: true,
            preferredMode: true,
            budgetTierId: true,
            countryCode: true,
          },
        },
      },
    });

    if (!student) {
      return { completed: false, required: false, completedSteps: [] as boolean[] };
    }

    const rec = student.recommendationProfile;
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
        previousEducation: true,
        employmentStatus: true,
        institute: true,
        fieldOfStudy: true,
        degreeProgram: true,
        yearOrGrade: true,
        enrollmentStartDate: true,
        expectedGraduationDate: true,
        academicStatus: true,
        gpa: true,
        targetCareer: true,
        qualifications: {
          select: { id: true, qualification: true, institute: true, yearCompleted: true, grade: true },
          orderBy: { createdAt: "asc" },
        },
        recommendationProfile: {
          select: {
            interests: true,
            careerGoals: true,
            skillLevel: true,
            preferredMode: true,
            budgetTierId: true,
            countryCode: true,
            contributionGoals: true,
            opportunityInterests: true,
            skills: true,
          },
        },
      },
    });

    // Return empty defaults if student record not yet created
    if (!student) {
      return {
        phone: "", dateOfBirth: "", gender: "", city: "", district: "",
        nationality: "",
        educationLevel: "", employmentStatus: "",
        institute: "", fieldOfStudy: "", degreeProgram: "", yearOrGrade: "",
        enrollmentStartDate: "", expectedGraduationDate: "", academicStatus: "",
        gpa: "", targetCareer: "",
        qualifications: [] as { id: string; qualification: string; institute: string | null; yearCompleted: string | null; grade: string | null }[],
        interests: [] as string[], careerGoals: [] as string[],
        skillLevel: "", preferredMode: "", budgetTierId: "", countryCode: "",
        contributionGoals: [] as string[], opportunityInterests: [] as string[], skills: [] as string[],
      };
    }

    const rec = student.recommendationProfile;

    return {
      phone:           ctx.profile.phone ?? "",
      dateOfBirth:     ctx.profile.dateOfBirth
        ? new Date(ctx.profile.dateOfBirth).toISOString().split("T")[0]!
        : "",
      gender:          ctx.profile.gender ?? "",
      city:            ctx.profile.city ?? "",
      district:        ctx.profile.district ?? "",
      nationality:     ctx.profile.nationality ?? "",
      educationLevel:  student.previousEducation ?? "",
      employmentStatus: student.employmentStatus ?? "",
      institute:       student.institute ?? "",
      fieldOfStudy:    student.fieldOfStudy ?? "",
      degreeProgram:   student.degreeProgram ?? "",
      yearOrGrade:     student.yearOrGrade ?? "",
      enrollmentStartDate:    student.enrollmentStartDate
        ? new Date(student.enrollmentStartDate).toISOString().split("T")[0]!
        : "",
      expectedGraduationDate: student.expectedGraduationDate
        ? new Date(student.expectedGraduationDate).toISOString().split("T")[0]!
        : "",
      academicStatus:  student.academicStatus ?? "",
      gpa:             student.gpa ?? "",
      targetCareer:    student.targetCareer ?? "",
      qualifications:  student.qualifications,
      interests:       (rec?.interests ?? []) as string[],
      careerGoals:     (rec?.careerGoals ?? []) as string[],
      skillLevel:      rec?.skillLevel ?? "",
      preferredMode:   rec?.preferredMode ?? "",
      budgetTierId:    rec?.budgetTierId ?? "",
      countryCode:     rec?.countryCode ?? "",
      contributionGoals:    (rec?.contributionGoals ?? []) as string[],
      opportunityInterests: (rec?.opportunityInterests ?? []) as string[],
      skills:               (rec?.skills ?? []) as string[],
    };
  }),

  // Saves whatever recommendation fields exist — partial saves are valid
  upsertRecommendationProfile: protectedProcedure
    .input(upsertRecommendationProfileInput)
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
        ...(input.contributionGoals    !== undefined && { contributionGoals:    input.contributionGoals }),
        ...(input.opportunityInterests !== undefined && { opportunityInterests: input.opportunityInterests }),
        ...(input.skills                !== undefined && { skills:               input.skills }),
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
          contributionGoals:    input.contributionGoals    ?? [],
          opportunityInterests: input.opportunityInterests ?? [],
          skills:                input.skills                ?? [],
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

  // ── Public shareable profile: owner's own profile (auto-creates row on first access) ─────────
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const student = await ctx.db.student.findUnique({
      where: { profileId: ctx.profile.id },
      include: studentDetailInclude(),
    });
    if (!student)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Student profile not found",
      });

    const publicProfile = await ctx.db.studentPublicProfile.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        visibility: DEFAULT_OWNER_VISIBILITY,
        isPublic: false,
      },
      update: {},
    });

    return {
      id: publicProfile.id,
      studentId: student.id,
      tagline: publicProfile.tagline,
      personalStatement: publicProfile.personalStatement,
      location: publicProfile.location,
      shareToken: publicProfile.shareToken,
      isPublic: publicProfile.isPublic,
      visibility: normalizeVisibility(publicProfile.visibility),
      profile: {
        fullName: student.profile.fullName,
        avatarUrl: student.profile.avatarUrl,
        isVerified: student.profile.isVerified,
      },
      researchPapers: student.researchPapers,
      journey: computeJourneyStages(student),
      currentInstitute: computeCurrentInstitute(student.enrollments),
      education: buildEducationSummary(student),
      ...buildProgramsAndCourses(student),
    };
  }),

  // ── Public shareable profile: upsert profile fields + visibility + public toggle ────────
  upsertPublicProfile: protectedProcedure
    .input(
      z.object({
        tagline: z.string().max(120).optional(),
        personalStatement: z.string().max(2000).optional(),
        location: z.string().max(120).optional(),
        isPublic: z.boolean(),
        visibility: visibilityInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      return ctx.db.studentPublicProfile.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
          tagline: input.tagline ?? null,
          personalStatement: input.personalStatement ?? null,
          location: input.location ?? null,
          isPublic: input.isPublic,
          visibility: input.visibility,
        },
        update: {
          tagline: input.tagline ?? null,
          personalStatement: input.personalStatement ?? null,
          location: input.location ?? null,
          isPublic: input.isPublic,
          visibility: input.visibility,
        },
      });
    }),

  // ── Public shareable profile: add research paper ─────────────────────────
  addResearchPaper: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        status: z.enum(["PUBLISHED", "UNDER_REVIEW"]),
        link: z.string().url().optional(),
        publishedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      return ctx.db.researchPaper.create({
        data: {
          studentId: student.id,
          title: input.title,
          status: input.status,
          link: input.link ?? null,
          publishedAt: input.publishedAt ?? null,
        },
      });
    }),

  // ── Public shareable profile: update research paper ──────────────────────
  // `link`/`publishedAt` use `.nullish()` so the client can distinguish
  // "field not touched" (undefined — Prisma leaves it unchanged) from
  // "field explicitly cleared" (null — Prisma sets it to null). A plain
  // `.optional()` string can't express the clear-this-field case, which
  // previously made clearing a link silently no-op.
  updateResearchPaper: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        status: z.enum(["PUBLISHED", "UNDER_REVIEW"]).optional(),
        link: z.string().url().nullish(),
        publishedAt: z.date().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);
      const { id, ...data } = input;

      const existing = await ctx.db.researchPaper.findUnique({ where: { id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.studentId !== student.id)
        throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.researchPaper.update({ where: { id }, data });
    }),

  // ── Public shareable profile: delete research paper ──────────────────────
  deleteResearchPaper: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudent(ctx.db, ctx.profile.id);

      const existing = await ctx.db.researchPaper.findUnique({
        where: { id: input.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.studentId !== student.id)
        throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.researchPaper.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ── Public shareable profile: public read (security-critical) ───────────
  getPublicProfile: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.studentPublicProfile.findUnique({
        where: { shareToken: input.token },
        include: { student: { include: studentDetailInclude() } },
      });

      // Identical error whether the token doesn't exist or the profile is
      // private — never let the client distinguish the two cases.
      if (!row || row.isPublic !== true) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const vis = normalizeVisibility(row.visibility);
      const student = row.student;

      const currentInstitute = computeCurrentInstitute(student.enrollments);
      const { programs, courses } = buildProgramsAndCourses(student);

      // Built via conditional spread (not mutation of a Record<string, unknown>)
      // so the tRPC-inferred client type keeps each section as a properly
      // typed optional field instead of collapsing to `unknown`.
      return {
        ...(vis.header
          ? {
              header: {
                fullName: student.profile.fullName,
                avatarUrl: student.profile.avatarUrl,
                isVerified: student.profile.isVerified,
                tagline: row.tagline,
                personalStatement: row.personalStatement,
                location: row.location,
              },
            }
          : {}),
        ...(vis.journey ? { journey: computeJourneyStages(student) } : {}),
        ...(vis.education ? { education: buildEducationSummary(student) } : {}),
        ...(vis.currentInstitute ? { currentInstitute } : {}),
        ...(vis.researchPapers
          ? {
              researchPapers: student.researchPapers.map((p) => ({
                id: p.id,
                title: p.title,
                status: p.status,
                link: p.link,
                publishedAt: p.publishedAt,
              })),
            }
          : {}),
        ...(vis.programs ? { programs, courses } : {}),
        // Note: sidebar intentionally does NOT re-embed currentInstitute —
        // that would leak it even when the currentInstitute section itself
        // is toggled off. Sidebar is just an aggregate "quick facts" widget.
        ...(vis.sidebar
          ? {
              sidebar: {
                totalPrograms: programs.length,
                totalResearchPapers: student.researchPapers.length,
              },
            }
          : {}),
      };
    }),
});
