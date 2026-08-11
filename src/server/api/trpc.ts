import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { createClient } from "~/lib/supabase/server";

// ── Context ────────────────────────────────────────────────────────────────
// This runs on every request. It attaches the Supabase user + Prisma profile
// to ctx so every router can access them without re-fetching.

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const supabase = await createClient();

  // Get authenticated Supabase user (verified server-side)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, fetch their full profile + lecturer/manager info
  const profile = user
    ? await db.profile.findUnique({
        where: { id: user.id },
        include: {
          lecturer: {
            include: {
              managedInstitutions: true, // InstitutionManager rows
            },
          },
          employer: true,
        },
      })
    : null;

  return {
    db,
    user,
    profile,
    ...opts,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// ── tRPC init ──────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ── Router & procedure helpers ─────────────────────────────────────────────

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public procedure — no auth required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires a logged-in Supabase user with an active profile
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.profile) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (!ctx.profile.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Account is suspended" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      profile: ctx.profile,
    },
  });
});

/**
 * Lecturer procedure — requires LECTURER role + approved status
 */
export const lecturerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.profile.role !== "LECTURER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Lecturer access required" });
  }
  if (!ctx.profile.lecturer) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Lecturer profile not found" });
  }
  if (ctx.profile.lecturer.approvalStatus !== "APPROVED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your lecturer account is pending approval",
    });
  }
  return next({
    ctx: {
      ...ctx,
      profile: ctx.profile,
      lecturer: ctx.profile.lecturer,
    },
  });
});

/**
 * Employer procedure — requires EMPLOYER role + approved status
 */
export const employerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.profile.role !== "EMPLOYER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Employer access required" });
  }
  if (!ctx.profile.employer) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Employer profile not found" });
  }
  if (ctx.profile.employer.approvalStatus !== "APPROVED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your employer account is pending approval",
    });
  }
  return next({
    ctx: {
      ...ctx,
      profile: ctx.profile,
      employer: ctx.profile.employer,
    },
  });
});

/**
 * Managing lecturer procedure — requires LECTURER role + is an InstitutionManager
 * with canManagePrograms: true
 */
export const managerProcedure = lecturerProcedure.use(({ ctx, next }) => {
  const managerEntry = ctx.lecturer.managedInstitutions.find(
    (m: { canManagePrograms: boolean }) => m.canManagePrograms,
  );
  if (!managerEntry) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Institution manager access required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      managerEntry, // the InstitutionManager row
    },
  });
});

/**
 * Admin procedure — requires is_admin flag
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.profile.is_admin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx: { ...ctx, profile: ctx.profile } });
});