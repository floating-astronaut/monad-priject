# Implementation Lanes

Tejas opens lanes in this order. Only lanes with satisfied dependencies may be
claimed. One owner per surface.

> Roster note (2026-07-25): Codex left the project; all lanes it owned were
> reassigned to Claude. Ordering and dependencies are unchanged. FE lanes no
> longer run truly parallel to BE lanes — one agent works them in sequence, so
> the critical path is longer than this graph implies. See `ROLES.md`.

## Phase A — decisions and environment

### OP-1 — Operator decisions

Owner: Tejas  
Acceptance: blocking items in `OPEN-QUESTIONS.md` answered.  
Write-back: open questions and affected contracts.

### ENV-1 — Burner wallets

Owner: Tejas  
Acceptance: public deployer/principal/agent addresses recorded without keys;
both wallets funded with testnet MON.  
Blocks: BE-3.

> Split 2026-07-26. This lane originally also carried "Cloudflare can access
> GitHub". The wallet half completed while the hosting half had not started, and
> the two block different lanes — wallets block BE-3, hosting blocks DEP-1.
> Keeping them joined would have held BE-3 behind unrelated work. Hosting moved
> to ENV-2.

### ENV-2 — Cloudflare and GitHub access

Owner: Tejas  
Acceptance: the Cloudflare account in OP-1 Q5 can build this repo from Git;
a Pages project exists and is bound to the correct branch.  
Blocks: DEP-1.

## Phase B — backend and chain

### BE-1 — Contract authorization hardening

Owner: Claude  
Reading: `BUILD-SPEC.md`, `ARCHITECTURE.md`, `SECURITY.md`  
Acceptance: identity cannot be overwritten by unrelated principal; authorization
tests pass.

### BE-2 — Foundry verification suite

Owner: Claude  
Depends on: BE-1  
Acceptance: unit/fuzz boundaries, event assertions, gas snapshot green using
Monad Foundry; clean-machine commands documented.

### BE-3 — Deployment and ABI export

Owner: Claude  
Depends on: BE-2, ENV-1  
Acceptance: dry-run and broadcast succeed; ABI generated from artifact; address
manifest records chain, contract, deploy tx, action ID, compiler, commit.

### BE-4 — Explorer verification and CLI proof

Owner: Claude  
Depends on: BE-3  
Acceptance: source verified; principal register/policy and agent deny/pass
reproduced with `cast`; explorer URLs recorded in the address manifest.

## Phase C — frontend

### FE-1 — Frontend architecture cleanup

Owner: Claude  
Parallel with: BE-1/BE-2 using frozen mock ABI  
Acceptance: setup/action/simulation modes separated; no demo monolith;
typecheck green.

### FE-2 — Principal setup flow

Owner: Claude  
Depends on: ABI freeze  
Acceptance: correct-chain wallet can register and set/pause policy; UI shows
submission, receipt, and decoded errors.

### FE-3 — Agent fail/pass flow

Owner: Claude  
Depends on: BE-4 handoff  
Acceptance: distinct agent shows real over-cap denial, successful attestation,
and explorer proof; simulated hash never appears live.

### FE-4 — Responsive/accessibility polish

Owner: Claude  
Depends on: FE-2, FE-3  
Acceptance: projector, 375 px phone, keyboard, focus, contrast, disabled/loading,
and reduced-motion checks pass.

## Phase D — deploy and prove

### DEP-1 — Cloudflare preview

Owner: Claude  
Depends on: FE-3, ENV-2  
Acceptance: Git preview builds from `ui/`, public env correct, SPA fallback and
console checks pass.

### DEP-2 — Cloudflare production

Owner: Claude  
Depends on: FE-4, Tejas go/no-go  
Acceptance: `main` deployment recorded; SHA matches; wallet, deny/pass, explorer
smoke green.

### VER-1 — Full-story verification

Owner: Claude  
Depends on: BE-4, DEP-2  
Acceptance: independently checks backend claims and production demo from fresh
browser profile with observed evidence.

### DEMO-1 — Pitch and fallback pack

Owner: Claude  
Depends on: VER-1  
Acceptance: live talk track under 90 seconds, backup video on two devices,
URLs/addresses/README ready.

### SHIP-1 — Freeze and submit

Owner: Tejas  
Depends on: DEMO-1  
Acceptance: submission sent; only Tejas may authorize production hotfix.

## Kill switches

- Contract deploy blocked: Claude uses Anvil truthfully and the UI falls back to simulation;
  Tejas retries deployment with mentor.
- Cloudflare Git deploy blocked: Claude direct-uploads `ui/dist` with Wrangler.
- Wallet blocked: clean browser profile or second laptop.
- RPC unstable: switch only to a provider on the current Monad network page.
- Explorer delayed: show hash and `cast receipt`; do not claim source verified
  until the explorer confirms it.

