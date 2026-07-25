# Active Lane Board

> The single live queue. Lanes move: OPEN → CLAIMED → IN PROGRESS → IN VERIFICATION → CLOSED.
> Format + rules: see docs/LANE-LIFECYCLE.md.

## Active

### OP-1 — Operator decisions [OPEN]

Owner: Tejas
Opened: 2026-07-25
Reading: `docs/OPEN-QUESTIONS.md`, `docs/BUILD-SPEC.md`,
`docs/IMPLEMENTATION-LANES.md`
Acceptance: all blocking questions answered; important questions answered or
explicitly deferred; first build lanes authorized
Write-back: `docs/OPEN-QUESTIONS.md` and every affected contract doc
Notes: no agent begins implementation until Tejas closes this lane.

## Recently closed

- **DOC-1 — Build, deployment, and demo source-of-truth** [CLOSED] — official
  Monad/Cloudflare/tooling research converted into sourced build, local-run,
  deployment, testing, security, demo, role, lane, and operator-decision docs;
  no product code changed.
- **MG-1 — Hackathon MVP and repository bootstrap** [CLOSED] — React demo,
  Monad gate contract, ABI handoff, Vibe control plane, verified fail/pass flow,
  and initial GitHub `main` branch shipped.
