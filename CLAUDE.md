# CLAUDE.md

## Project

T3 Stack app: Next.js 15 (App Router), tRPC 11, Prisma 6, NextAuth 5 (beta),
Supabase, Tailwind 4, Zod, TypeScript 5.8, npm.

## Mission

Build production-ready software with maintainable architecture, strong
test coverage, security, and minimal technical debt. Optimize for
long-term maintainability over short-term speed.

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
conversation's context — only summaries return. Keep it that way:

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