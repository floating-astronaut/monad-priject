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

### BE-1b — Attestation nonce in event [OPEN]

Owner: Claude
Opened: 2026-07-26
Reading: `docs/SECURITY.md`, `docs/ARCHITECTURE.md`
Acceptance: `ActionAttested` carries the nonce; `attestationId` is recomputable
off-chain from the event alone, proven by a test; `packages/abi/gate.json`
re-exported; UI decodes the new event shape
Write-back: `docs/SECURITY.md` contract controls, `docs/ARCHITECTURE.md`
Notes: split out of BE-1 deliberately — the only **breaking** ABI change in the
BE-1 proposal, so it must land paired with the UI update rather than mid-lane.
Until it lands, the verifiability claim in `SECURITY.md` is not met.

### BE-2 — Foundry verification suite [OPEN]

Owner: Claude
Opened: 2026-07-26
Depends on: BE-1 (closed)
Reading: `docs/TESTING.md`, `docs/MONAD-DEPLOYMENT.md`
Acceptance: unit/fuzz boundaries, event assertions, gas snapshot green under
Monad Foundry; clean-machine commands documented
Notes: BE-1 left 14 hand-rolled tests using a local `Vm` interface rather than
`forge-std`. BE-2 should decide whether to adopt `forge-std` before the suite
grows further.

## Recently closed

- **BE-1 — Contract authorization hardening** [CLOSED 2026-07-26] — agent
  seizure and privilege escalation fixed and regression-tested; `PrincipalIsAgent`
  and `ResultAlreadyAttested` added; `transferPrincipal` / `rotateAgent` added
  with policy carried and the retired slot cleared. `forge test`: 14 passed, 0
  failed. `forge fmt --check` clean (was already failing before this lane).
  Nonce-in-event deferred to BE-1b.
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
