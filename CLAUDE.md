# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

T3 Stack app: Next.js 15 (App Router), tRPC 11, Prisma 6, Supabase (Auth +
Postgres), Tailwind 4, Zod, TypeScript 5.8, npm.

`next-auth` is present in `package.json` but has zero imports anywhere in
`src` — it's an unused dependency, not the auth system. Auth is entirely
Supabase Auth (`@supabase/ssr`) — see "Auth & authorization" below before
touching anything login-related.

## Mission

Build production-ready software with maintainable architecture, strong
test coverage, security, and minimal technical debt. Optimize for
long-term maintainability over short-term speed.

Note: this repo currently has no test runner configured (no jest/vitest,
no `test` script) — "strong test coverage" is an aspiration, not a
current state. Don't assume test infrastructure exists.

## Core Principles

1. Research before coding.
2. Reuse existing patterns whenever possible.
3. Prefer modifying existing files over creating new ones.
4. Keep solutions simple; avoid unnecessary abstractions.
5. Follow existing architecture and validate assumptions against the
   actual codebase.
6. Never invent tRPC procedures, Prisma fields, env vars, or business
   rules that aren't confirmed to exist.
7. Consider security, scalability, and performance.
8. Minimize technical debt.

## Execution Modes

### Interactive Mode

Default when you ask for work manually: Research → Plan → wait for your
approval → Implement → Test → Review.

### Autonomous Ticket Mode

**Not currently wired up in this repo.** This section references
`.claude/agents/`, `.claude/commands/handle-ticket.md`, and
`.claude/settings.json` — none of these exist yet. `/handle-ticket` will
have nothing to run until that scaffolding is added. Treat the rest of
this section as the target design, not current behavior.

Trigger:

```
/handle-ticket <JIRA-KEY> [additional context]
```

Examples:

```
/handle-ticket INX-123
/handle-ticket INX-123 Reuse the existing webhook handler instead of a new endpoint
/handle-ticket INX-EPIC-9
```

`<JIRA-KEY>` may be a regular issue **or an epic**. For an epic, the
workflow pulls the epic's child issues and treats them as the scope.

Everything after the key is free-form additional context: hints, scope
limits, known gotchas, or pointers to related code.

**The command triages before doing anything else.** Trivial, single-file,
no-design-decision changes take a lightweight path in the main session —
no subagents spun up. Anything with real scope, ambiguity, or schema/API
changes runs the full researcher → architect → implementer → qa-reviewer
→ pr-manager pipeline (defined in `.claude/agents/`). This exists purely
to avoid paying for five agent handoffs on a one-line fix — see
`.claude/commands/handle-ticket.md` for the exact criteria and the
lightweight path's steps.

The QA ↔ implementer fix loop is capped at 2 rounds. If it's still
failing after that, the workflow stops and asks you rather than looping
indefinitely.

**In Autonomous Mode, do not stop for approval except when:**

- Requirements are ambiguous
- Security-sensitive changes are detected
- Infrastructure changes are required
- A destructive database migration is detected
- A major architectural change is required
- UI/frontend changes were implemented — stop for manual test
  confirmation before PR generation (see the command file's
  "Change-type gate")

Otherwise, run to completion.

## Additional Context Rules

- The Jira issue (or epic + children) remains the source of truth for
  requirements and acceptance criteria.
- Additional context supplements it — guidance on **how**, not a
  replacement for **what**.
- If additional context conflicts with the Jira item, treat it as
  ambiguous and stop to confirm.
- The Research Report records which requirements came from Jira and
  which came from user-provided context.

## Git Workflow

- Branch naming: `feature/<jira-key>-<slug>` (e.g. `feature/INX-451-google-calendar`)
- Commit format: `<jira-key>: <summary>`
- Never commit or push directly to `main`. Always use a feature branch
  and open a pull request via `gh pr create`.

## Backend Standards

- Business logic lives in service functions or tRPC procedure bodies,
  not scattered across components.
- Every tRPC input has a Zod schema. No unchecked `any`.
- Avoid duplicated Prisma queries — extract shared query logic.

## Frontend Standards

- Reuse existing components; prefer composition over new one-off components.
- Follow the existing Tailwind conventions already in the repo (don't
  introduce a new styling approach).

## Database Standards

- Additive migrations by default. Any destructive migration (dropped
  column/table, non-nullable without a default, etc.) must be flagged
  explicitly in the Architecture Plan and approved before running.
- `prisma migrate dev` locally only; `prisma migrate deploy` is an
  `ask`-gated command (see `.claude/settings.json`) and should only run
  in the workflow this repo actually uses for deploys.

## Definition of Done

- Acceptance criteria satisfied
- Tests, lint, and typecheck passing
- QA review passed
- Manual UI test confirmed by user, if applicable
- Branch pushed, PR opened
- Jira updated

## Token/Cost Notes (Claude Pro plan)

This project intentionally uses subagents (`.claude/agents/`) so verbose
codebase search, test output, and lint logs stay out of the main
conversation's context — only summaries return. Keep it that way, once
that agent scaffolding exists (see the note under Autonomous Ticket Mode):

- Don't inline large file dumps or full test logs into the main chat;
  let the relevant subagent digest them first.
- The `researcher` and `architect` agents are read-only by design —
  don't grant them Write/Edit even temporarily.
- `pr-manager` runs on Haiku by default since drafting a PR body from
  already-produced reports doesn't need a stronger model. Bump it in
  `.claude/agents/pr-manager.md` if your PR descriptions need more
  nuance.
- Prefer `/handle-ticket` for well-scoped issues over ad hoc multi-hour
  interactive sessions — the staged agent handoffs mean each phase only
  loads the context it actually needs.

## Special Instructions

When working a Jira item, think like a Senior Staff Engineer: understand
requirements, existing architecture, risks, and dependencies before
writing any code. Prefer consistency with the existing codebase over
introducing new patterns.

## Commands

```bash
npm run dev              # start dev server (Next.js, Turbopack) on :3000
npm run build             # production build
npm run start              # run a production build
npm run preview            # build + start

npm run check              # next lint + tsc --noEmit (run this before considering work done)
npm run lint                # next lint only
npm run lint:fix
npm run typecheck           # tsc --noEmit only
npm run format:check        # prettier --check
npm run format:write        # prettier --write

npm run db:generate         # prisma migrate dev (creates a migration + regenerates client)
npm run db:migrate          # prisma migrate deploy (apply pending migrations, no prompt)
npm run db:push             # prisma db push (schema sync without a migration file)
npm run db:studio           # prisma studio
```

There is no test runner configured in this repo (no jest/vitest, no `test` script) — don't assume one exists.

`next.config.js` sets `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`, so `npm run build` will succeed even with type or lint errors. Always run `npm run check` separately to actually catch them.

After changing `prisma/schema.prisma`, run `npm run db:generate`, then manually re-run `supabase/setup.sql` in the Supabase SQL editor (see below — this is not automatic).

## Architecture

Next.js 15 (App Router) + React 19, tRPC v11, Prisma 6 over Postgres (Supabase), Supabase Auth (`@supabase/ssr`), Tailwind v4. Path alias `~/*` → `src/*`.

### Auth & authorization — three layers

1. **Supabase Auth** is the identity provider. `src/lib/supabase/{server,client,middleware}.ts` create SSR/browser/middleware clients from cookies. `src/lib/supabase/admin.ts` creates a service-role client for privileged server actions (banning users, etc.) — never expose this client-side.
2. **`src/middleware.ts`** calls `updateSession()` in `src/lib/supabase/middleware.ts` on every request. It must live in `src/` — because this repo uses a `src/` directory, Next.js silently ignores a root-level `middleware.ts` (this was a real bug: the file sat at the root and never ran; don't move it back). It does coarse route-level gating by reading `Profile.role`/`isActive` directly via a Supabase query (not Prisma): redirects unauthenticated users to `/login`, suspended users to `/suspended`, and enforces that `/admin` and `/institution` are only reachable by matching roles.
3. **tRPC procedures** (`src/server/api/trpc.ts`) do the fine-grained authorization, layered as: `publicProcedure` → `protectedProcedure` (logged in + active) → `lecturerProcedure` (role LECTURER + `Lecturer.approvalStatus === "APPROVED"`) → `managerProcedure` (also an `InstitutionManager` row with `canManagePrograms`). `adminProcedure` branches off `protectedProcedure` and checks `profile.is_admin`. Each layer attaches narrowed, non-null context (e.g. `ctx.lecturer`) for the next.

`createTRPCContext` fetches the Supabase user, then the matching `Profile` (+ `lecturer.managedInstitutions`) via Prisma on every request — routers can rely on `ctx.profile` being present and correctly shaped inside `protectedProcedure` and above.

Admin (`src/app/admin/actions.ts`) and institution (`src/app/institution/actions.ts`) management flows use Next.js server actions (`"use server"`) with `createAdminClient()` + direct Prisma calls instead of tRPC — this is the established pattern for privileged, form-driven mutations tied to `revalidatePath`.

### Data model

`prisma/schema.prisma` is the source of truth (Postgres, `public` schema, multiSchema preview). Core shape:

- `Profile` is the central user row (1:1 with Supabase `auth.users.id`), carries `role` (`STUDENT`/`LECTURER`/`EMPLOYER`/`INSTITUTION`/`ADMIN`) and fans out to at most one of `Student` / `Lecturer` / `Employer` / `InstitutionAccount`.
- `Institution` → `Program` → `Course` → `CourseSection` → `CourseResource` is the content hierarchy. `Course.isStandalone` lets a course exist without a parent `Program`.
- Enrollment is tracked at both program level (`Enrollment`) and course level (`CourseEnrollment`), each with its own status enum.
- `Assessment` / `AssessmentSubmission`, `ResourceProgress`, `Credential` cover coursework and completion.
- `Lecturer.approvalStatus`, `Institution.approvalStatus`, `Employer.approvalStatus`, `Program.approvalStatus` are independent moderation gates — check the right one for the entity you're touching.
- `InstitutionManager` is a join row granting a `Lecturer` scoped permissions (`canManagePrograms`, `canEditProfile`, etc.) over an `Institution` — this is what `managerProcedure` checks.
- `StudentProfile` + `ProgramEmbeddingMeta` + `RecommendationInteraction` back the recommendation engine (`src/lib/recommendation/` + `src/lib/taxonomy/`, served by the `studentProfile` tRPC router). `StudentProfile` is written by the profile-setup intake quiz; `Program.priceUsd` is synced from `foreignPrice` (already USD) on program create/update; `RecommendationInteraction` logs SHOWN/CLICKED rows. `Program.interestTags` is free-form text — scoring only trusts entries that are valid taxonomy ids and always falls back to the `ProgramField` → interest mapping in `src/lib/taxonomy/programFieldMapping.ts`. `ProgramEmbeddingMeta` is unused (reserved for a future embedding-based upgrade); matching is deliberately rule-based. Hard filters (region/budget/delivery mode) gate eligibility only and must never contribute to the ranking score — a program with zero interest/career overlap is excluded, not shown as a weak match.

New auth/DB triggers, grants, and RLS policies live in `supabase/setup.sql`, which is idempotent (safe to re-run) but must be run **manually** in the Supabase SQL editor after `prisma migrate reset` or schema changes — Prisma migrations do not apply it. Keep it in sync with `schema.prisma` when adding tables/columns that need RLS.

### Known inconsistencies (don't propagate these)

- `next-auth` is a listed dependency with no imports anywhere in `src` — dead dependency. Don't build auth flows against it; use the Supabase Auth pattern described above.
- Two Prisma client wrappers exist: `src/server/db.ts` (uses the default `@prisma/client` output, exported as `db`) is the one actually used everywhere (`ctx.db` in tRPC, server actions). `src/lib/prisma.ts` imports from a stray `generated/prisma` client output and has no callers — treat it as dead code, don't import from it.
- `src/server/api/routers/root.ts` is a stale duplicate of `src/server/api/root.ts` missing several routers (no `courseResource`, `libraryResource`, `studentCourse`, `studentProgram`, `enrollment`, `studentProfile`) and nothing imports it. The real router tree wired to `/api/trpc/[trpc]` and the React client is `src/server/api/root.ts` — add new routers there.
- `src/lib/stripe.ts` is an empty stub despite `Payment.paymentMethod` having a `STRIPE` option — payment integration isn't actually implemented yet.
- Only `AUTH_SECRET`, `DATABASE_URL`, and `NODE_ENV` are validated through `src/env.js` (t3-env/zod). `DIRECT_URL` (used by Prisma for migrations), the Supabase vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), and any Stripe vars are read directly via `process.env` and are **not** listed in `.env.example` — check `.env` directly for what's actually required rather than trusting the example file.
