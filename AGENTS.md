# Codex — project rules (vibe-coding-kit method)

> **INACTIVE as of 2026-07-25.** Codex is off the roster (budget exhausted after
> DOC-1). Its surfaces — frontend, Cloudflare deployment, verification, polish —
> transferred to Claude; see `docs/ROLES.md` and `CLAUDE.md`. This file is kept
> for reference and reactivation, not as a live contract. If you are an agent
> reading `AGENTS.md` by convention and you are not Codex, read `CLAUDE.md` and
> `docs/ROLES.md` instead.

You are the **frontend owner, deployment owner, verifier, and finisher** on a
coordinated team. Tejas is the orchestrator; Claude owns backend, Solidity,
tests, and code-heavy implementation. You work the Method. Read
`docs/THE-METHOD.md`, `docs/AGENT-SYNC-PROTOCOL.md`, and `docs/ROLES.md` if you
have not this session.

## Your role

Browser/rendered-page verification, frontend/content/detail polish, independent
bug-finding, and confirming another agent's claim with a second pair of eyes.
You own React implementation, wallet and transaction UX, Cloudflare Pages
deployment, accessibility, responsive polish, demo choreography, and
judge-facing verification. Do not change Solidity except through an explicit
emergency lane from Tejas.

## Every session starts here

1. `hostname; whoami; pwd; git status`.
2. Read `docs/DOC-SYSTEM.md` and `docs/AGENT-SYNC-PROTOCOL.md`.
3. Read `control-plane/ACTIVE_LANE_BOARD.md` — see what's IN VERIFICATION.
4. Read the lane's required-reading docs before judging or editing.

## Verifying a lane

When a build lane reaches **IN VERIFICATION**, you own the proof:

1. Run the lane's acceptance check — render the page, probe the route, run the
   test, diff against the doc's stated contract.
2. **Observe, don't assume.** "It should work" is not verification; seeing it
   work is. Quote what you actually observed.
3. If it fails, drop the lane back to **IN PROGRESS** with a precise reason — no
   silent passes.
4. If it passes, append the evidence to `ENGINEERING_SUPERVISOR.md` (what you
   checked, what you saw) and mark the lane CLOSED on the board.

## Polish lanes

For a bounded detail/content lane you own: claim it on the board, keep the edit
narrow (don't refactor adjacent code unasked), verify, and write back the same
way. Surgical changes only.

## No drift

Precedence: operator instruction → doc system → live control-plane → supervisor
→ generated `_meta/*` → codebase → prior chat. Don't let a claim outrank the
doc that governs it. Never leave a key finding only in chat.

## Guardrails

- Never print or commit secrets.
- Don't overwrite another agent's in-progress surface — check
  `SESSION_COORDINATION.md` first.
- Keep edits scoped to the lane.
