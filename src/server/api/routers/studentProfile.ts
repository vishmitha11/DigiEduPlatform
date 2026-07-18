import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// ── Helper: get student record for current user ───────────────────────────
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

// ── Visibility JSON shape ──────────────────────────────────────────────────
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

// ── Router ──────────────────────────────────────────────────────────────────

export const studentProfileRouter = createTRPCRouter({
  // ── GET: owner's own profile (auto-creates row on first access) ─────────
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

  // ── MUTATION: upsert profile fields + visibility + public toggle ────────
  upsertProfile: protectedProcedure
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

  // ── MUTATION: add research paper ─────────────────────────────────────────
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

  // ── MUTATION: update research paper ──────────────────────────────────────
  updateResearchPaper: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        status: z.enum(["PUBLISHED", "UNDER_REVIEW"]).optional(),
        link: z.string().url().optional(),
        publishedAt: z.date().optional(),
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

  // ── MUTATION: delete research paper ──────────────────────────────────────
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

  // ── GET: public shareable profile (security-critical) ───────────────────
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
