---
description: Triage a Jira issue or epic, then run the research -> plan -> implement -> QA -> PR workflow — full pipeline for real work, a lightweight path for trivial changes
argument-hint: <JIRA-KEY> [free-form context: hints, scope limits, gotchas...]
---

Execute the ticket workflow for: $ARGUMENTS

The first token in the arguments above is the Jira key (issue or epic,
e.g. `INX-123` or `INX-EPIC-9`). Everything after it, if anything, is
user-provided additional context — implementation hints, scope limits,
or constraints. It supplements the Jira item; it never silently
overrides its requirements. If it conflicts with the Jira item, stop and
ask before proceeding (per CLAUDE.md's Additional Context rules).

## Step 0: Triage (main session, no subagent)

Before spinning up any agent, fetch just the Jira key's title, type, and
description yourself via the Atlassian MCP tools, and skim for an
obvious file reference if one's given. Classify:

- **Trivial**: single file, no schema/API/auth changes, no ambiguity —
  things like a copy change, a config value, an obvious one-line bug fix,
  a clear log/typo fix, bumping a constant. No design decision needed.
- **Real work**: anything else — new or changed tRPC procedures, Prisma
  schema changes, multi-file changes, new UI, unclear scope, or you're
  not confident it's trivial after a quick look.

**When uncertain, default to Real work.** A wrongly-escalated trivial
ticket costs one extra plan you can skim past; a wrongly-trivialized
real ticket risks a bad diff shipped without review — that's the more
expensive mistake on a Pro seat since fixing it later costs a whole
extra cycle.

- If **Trivial**: skip straight to the **Lightweight Path** below.
- If **Real work**: run the **Full Pipeline** below.

State which path you're taking and why, in one line, before proceeding.

## Lightweight Path (trivial changes)

No subagents. In the main session:

1. Make the change directly, following existing patterns in the touched
   file(s).
2. Run `npm run lint`, `npm run typecheck`, and the relevant test
   command.
3. If all green, create the feature branch, commit, push, open the PR,
   and post the Jira comment yourself — same branch/commit/PR
   conventions as the full pipeline (see CLAUDE.md).
4. If anything doesn't come back clean, or the change turns out to
   touch more than you expected once you're in the file: stop and
   escalate to the Full Pipeline instead of pushing through — don't
   burn cycles patching a lightweight fix into something it isn't.

## Full Pipeline (real work)

1. **Researcher agent**
   - Fetch the Jira key. If it's an epic, also fetch its child issues.
   - Fetch linked issues.
   - Incorporate any additional context passed above.
   - Research the codebase.
   - Produce the Research Report.

2. **Architect agent**
   - Turn the Research Report into an Architecture Plan.
   - If the plan flags security-sensitive changes, infra changes,
     destructive migrations, or a major architectural change: **stop
     here** and show the plan to the user for explicit approval before
     continuing.

3. **Implementer agent**
   - Create the feature branch.
   - Implement per the approved plan.
   - Update API docs if applicable.
   - Run tests, lint, typecheck.

4. **QA reviewer agent** (max 2 fix-and-recheck rounds)
   - Review the implementation against the plan and acceptance criteria.
   - If issues are found: send back to the implementer agent with the
     specific list, then re-run QA.
   - If QA still fails after **2 rounds** of fixes: stop and report the
     remaining issues to the user instead of looping a third time. Ask
     whether to keep iterating, adjust the plan, or hand it off for a
     human look — don't keep spending cycles silently.

5. **Change-type gate**
   - If the implementation includes UI/frontend changes:
     - Generate manual test cases (normal usage, key edge cases, likely
       failure states — not just the happy path) as a checklist.
     - **Stop and wait** for the user to test manually and report back.
     - If failures are reported: send details back to the implementer
       agent, fix, then regenerate test cases for re-verification.
     - Only proceed once the user explicitly confirms the tests passed.
   - If backend-only: skip this gate, continue automatically.

6. **PR manager agent**
   - Push the branch, open the PR, and post the Jira update comment.

Stop at any point (per CLAUDE.md) if requirements are ambiguous,
security-sensitive changes are detected, infrastructure changes are
required, a destructive migration is detected, or a major architectural
change is required — even if none of the steps above already caught it.