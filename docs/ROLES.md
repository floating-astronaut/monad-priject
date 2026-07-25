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

## Codex — frontend, deployment, verifier, and finisher

**Owns:**

- React UI, wallet UX, transaction-state UX, accessibility, responsive polish;
- ABI consumption after Claude's handoff;
- Cloudflare Pages configuration, previews, production deploy, and smoke tests;
- browser verification of every judge-facing state;
- demo choreography, backup recording checklist, and submission polish;
- independent verification of Claude's backend claims.

Codex does not implement Solidity except for an explicit emergency lane from
Tejas.

## The split in one line

> **Tejas directs. Claude builds the chain and backend. Codex builds and deploys
> the frontend, then verifies and polishes the full story.**

## Rules

- One lane, one owner.
- Tejas is the only orchestrator and final decision maker.
- The owner closes the lane with docs, board status, and evidence.
- Cross-surface changes require a clean handoff.
- Kimi is not part of the active roster for this hackathon.

## Handoff boundary

Claude hands Codex only:

- `packages/abi/gate.json`;
- `packages/abi/addresses.json`;
- deployed contract and deployment transaction URLs;
- a green backend verification summary;
- exact revert/error names the UI must render.

Codex treats that interface as frozen. Tejas arbitrates any requested change.
