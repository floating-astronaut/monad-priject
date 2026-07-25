# Roles — MONAD | Gate team contract

## Tejas — operator and orchestrator

**Authority:** product decisions, lane priority, scope, credentials, wallet
funding, judge strategy, and final go/no-go.

**Owns:**

- opening, assigning, pausing, and re-cutting lanes;
- resolving contract/UI disagreements;
- approving interface changes after the ABI freeze;
- providing Cloudflare and burner-wallet access;
- enforcing the hackathon clock and freeze;
- final submission and pitch delivery.

Tejas does not need to implement code. Agents must present decisions in
`docs/OPEN-QUESTIONS.md` and may not silently choose a scope-changing answer.

## Claude Code — backend and primary code builder

**Owns:**

- Solidity contract design and implementation;
- Foundry setup, unit/fuzz/invariant tests, deployment scripts, and ABI export;
- agent actor/CLI code and any backend or Cloudflare Worker API;
- security fixes and backend documentation write-back;
- Monad testnet deployment and contract verification with Tejas present for
  credential approval.

Claude may not change frontend UX or the frozen ABI without a handoff and Tejas
approval.

## Codex — withdrawn 2026-07-25

Codex is no longer on the roster; its budget was exhausted after DOC-1. Its
surfaces transfer to Claude: React UI, wallet and transaction UX, Cloudflare
Pages deployment, browser verification, and demo polish.

Codex's committed work stands (MG-1 MVP, DOC-1 doc system). Nothing is reverted.

## Claude — additionally, frontend and deployment (from 2026-07-25)

**Also owns, inherited from Codex:**

- React UI, wallet UX, transaction-state UX, accessibility, responsive polish;
- Cloudflare Pages configuration, previews, production deploy, and smoke tests;
- browser verification of every judge-facing state;
- demo choreography, backup recording checklist, and submission polish.

## Verification gap — read this

The roster no longer contains an independent verifier. Claude now builds and
checks its own work, which is the weakest arrangement for catching its own
mistakes.

Compensating rule: every lane's acceptance check must be **mechanical and
operator-reproducible** — a Foundry test run, a headless browser probe, an
explorer URL, a build exit code. Evidence in `ENGINEERING_SUPERVISOR.md` must be
something Tejas can re-run and see for himself. Narrative assurance ("verified
working") is not acceptable evidence under a single-agent roster.

## The split in one line

> **Tejas directs and verifies. Claude builds and deploys everything: chain,
> backend, frontend, and hosting.**

## Rules

- One lane, one owner.
- Tejas is the only orchestrator and final decision maker.
- The owner closes the lane with docs, board status, and evidence.
- Acceptance checks must be mechanical and reproducible by Tejas.
- Kimi is not part of the active roster for this hackathon.

## Interface boundary

The ABI handoff no longer crosses agents, but the boundary is kept as a
discipline: the UI consumes the contract only through

- `packages/abi/gate.json`;
- `packages/abi/addresses.json`;
- the exact revert/error names the UI must render.

Claude does not let frontend convenience reshape the contract. Changing the
frozen interface still requires an operator decision and an `ARCHITECTURE.md`
update, exactly as when two agents were active.
