# Active Lane Board

> The single live queue. Lanes move: OPEN → CLAIMED → IN PROGRESS → IN VERIFICATION → CLOSED.
> Format + rules: see docs/LANE-LIFECYCLE.md.

## Active

### ENV-1 — Burner wallets and access [OPEN]

Owner: Tejas
Opened: 2026-07-25
Reading: `docs/SECURITY.md`, `docs/MONAD-DEPLOYMENT.md`
Acceptance: two burner addresses recorded (deployer/principal, agent) with **no
private keys in the repo**; both funded with testnet MON; agent address handed
to Claude for the address manifest
Write-back: `packages/abi/addresses.json`, `docs/SECURITY.md`
Notes: per OP-1 Q2. Blocks BE-3 (deployment). Does **not** block BE-1 or BE-2 —
Claude works those against local Anvil in the meantime.

### BE-1 — Contract authorization hardening [OPEN]

Owner: Claude
Opened: 2026-07-25
Reading: `docs/BUILD-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`
Acceptance: an unrelated caller cannot overwrite an existing registration; only
the current principal may rotate, re-policy, or deactivate; duplicate
`resultHash` reverts; authorization tests pass under `forge test`
Write-back: `docs/ARCHITECTURE.md` frozen interface (new function signatures
require Tejas sign-off before implementation), `docs/SECURITY.md`
Notes: closes the overwrite flaw recorded against DOC-1. Implements OP-1 Q1, Q8,
Q9. First step is proposing the function surface — not writing Solidity.

## Recently closed

- **OP-1 — Operator decisions** [CLOSED 2026-07-25] — all six blocking questions
  answered (principal-controlled identity lifecycle; two burners; preconfigured
  demo state; MonadVision primary; existing Cloudflare account on `pages.dev`;
  lane branches + PR). Q8/Q9 answered, Q13 added and answered (no off-chain
  datastore). Q7/Q10/Q11/Q12 defaulted to their documented recommendations and
  flagged as not explicitly confirmed. Implementation authorized.
- **DOC-1 — Build, deployment, and demo source-of-truth** [CLOSED] — official
  Monad/Cloudflare/tooling research converted into sourced build, local-run,
  deployment, testing, security, demo, role, lane, and operator-decision docs;
  no product code changed.
- **MG-1 — Hackathon MVP and repository bootstrap** [CLOSED] — React demo,
  Monad gate contract, ABI handoff, Vibe control plane, verified fail/pass flow,
  and initial GitHub `main` branch shipped.

## Roster change

Codex left the project 2026-07-25 (budget exhausted). All its lanes reassigned
to Claude. **There is no independent verifier left** — acceptance checks must be
mechanical and reproducible by Tejas. See `docs/ROLES.md`.
