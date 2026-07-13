# Claude Code Infrastructure — Setup

Files in this bundle, dropped into your repo root:

```
CLAUDE.md
.mcp.json
.claude/
  settings.json
  agents/
    researcher.md
    architect.md
    implementer.md
    qa-reviewer.md
    pr-manager.md
  commands/
    handle-ticket.md
```

## 1. Install Claude Code (if not already)

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

Log in with your Pro-plan account: `claude` then follow the login prompt.

## 2. Drop these files into your repo root and commit them

**This step only applies to whoever is setting this up the first time.**
Once merged into your default branch, everyone else just gets these
files for free by cloning/pulling the repo like normal — there's
nothing else to copy or run.

```bash
git checkout -b chore/claude-infra
# copy files in
git add CLAUDE.md .mcp.json .claude/
git commit -m "chore: add Claude Code agent workflow for Jira-driven tickets"
git push -u origin chore/claude-infra
```

Open a PR, merge it, and from that point on `.claude/settings.json`,
`.claude/agents/`, `.claude/commands/`, and `.mcp.json` just live in the
repo like any other checked-in file. The remaining steps below (Jira
auth, `gh` auth) are still per-developer — those are personal
credentials, not something a commit can carry for you.

## 3. Connect Jira (Atlassian Rovo MCP)

`.mcp.json` already declares the `atlassian` server at project scope
(`https://mcp.atlassian.com/v1/mcp/authv2`, OAuth — no token to store).
The first time anyone opens Claude Code in this repo, they'll be
prompted to approve the project-scoped server. Then, inside a session:

```
/mcp
```

Select `atlassian`, choose **Authenticate**, and sign in through the
browser popup. This is a per-developer login — each teammate authenticates
their own Atlassian account and only sees what their account can see.

## 4. Connect GitHub

No MCP server here — `gh` CLI (native, via Bash) handles everything the
workflow needs: branch, commit, push, and PR creation. Install and auth
it once per machine:

```bash
brew install gh   # or your platform's equivalent
gh auth login
```

That's it — no token to store, no `.mcp.json` entry.

Verify:

```bash
claude mcp list
```

You should see `atlassian` `✓ Connected`. (Only `atlassian` is
configured now — GitHub goes through `gh`/`git` directly, not MCP.)

## 5. If you use the VS Code extension

Everything above still applies — `.mcp.json`, `.claude/`, and `CLAUDE.md`
are read the same way by the extension, since it bundles the same CLI
under the hood. A few things work differently in the graphical panel
though:

- **Login/logout**: Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) →
  type "Claude Code" → **Logout**, then sign back in through the browser
  prompt that follows. (Same thing as running `/logout` in the terminal.)
- **Adding MCP servers must happen via the integrated terminal**, not the
  chat panel — the panel can only *manage* servers that already exist,
  it can't add new ones. Since `atlassian` is already declared in
  `.mcp.json`, you don't need to add anything; just authenticate it.
- **To authenticate or manage `atlassian`**: type `/mcp` directly in the
  chat panel's prompt box (not the terminal). That opens the same
  dialog as the CLI — select `atlassian` → **Authenticate** → sign in
  through the browser popup.
- **To check exact server names/status**, use the integrated terminal
  (`` Ctrl+` `` / `` Cmd+` ``) and run `claude mcp list` — the panel's
  `/mcp` view doesn't always show full server details as clearly.
- **Running `/handle-ticket`**: type it straight into the chat panel's
  prompt box, same syntax as the CLI: `/handle-ticket INX-123 ...`.
- **Approving `.mcp.json` on first open**: the first time the extension
  opens this workspace, it'll show the same project-server trust prompt
  the CLI shows on first run. Approve it once per machine.
- **git/gh operations**: the extension can commit/push/create PRs
  directly by asking in plain language ("commit and push this, then
  open a PR") — you don't need to drop into the terminal for that part,
  though you're free to if you prefer watching the raw `git`/`gh` output.

## 6. Try it

```bash
claude
```

```
/handle-ticket INX-123
```

or, for a larger epic:

```
/handle-ticket INX-EPIC-9 skip the migration, staging already has the column
```

Claude will research (Jira + codebase), propose an Architecture Plan,
implement, self-review via QA, and — if it's a UI change — stop and
hand you a manual test checklist before opening the PR.

## 7. Adjust as your team learns

- `.claude/settings.json` is intentionally conservative (`git push` and
  `gh pr create` are `ask`-gated, not auto-allowed, and pushing/checking
  out `main` directly is denied). Loosen only what you're comfortable
  automating.
- If you want a Slack/other channel notified when a PR opens, that's a
  good candidate for a `PostToolUse` hook on `gh pr create` later — not
  included here to keep the initial setup lean.

## On agent count

Five agents (researcher, architect, implementer, qa-reviewer, pr-manager)
map directly onto the workflow's five real phases — each has a genuinely
different tool/permission profile (read-only research and planning vs.
write access for implementation vs. push/PR access at the end), which is
the actual reason to split them rather than run everything in the main
conversation. I'd resist adding more (e.g. a separate "branch-manager" or
"notifier" agent) — that's more subagent spin-up/context overhead for
steps that are one or two tool calls each, folded fine into implementer
and pr-manager as-is. If a real need shows up later (e.g. a dedicated
security-review pass for security-sensitive changes), it's a clean sixth
agent to add without touching the others.