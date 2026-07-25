# Engineering Supervisor — evidence log

> Append-only. Newest first. One entry per closed lane. See docs/LANE-LIFECYCLE.md §5.

## 2026-07-25 — DOC-1 — Build, deployment, and demo source-of-truth

- **Owner:** Codex
- **Read/researched:** supplied co-dev brief; existing product/architecture;
  Vibe Coding Kit control plane; current official Monad testnet, deployment,
  Foundry, verification, JSON-RPC, and changelog documentation; current
  Cloudflare Pages React, monorepo, build, local-development, Wrangler, and
  watch-path documentation; Vite environment guidance.
- **Changed:** created build spec, dependency-ordered implementation lanes,
  clean-machine runbook, Monad deployment/verification runbook, Cloudflare
  preview/production runbook, testing contract, security contract, operational
  demo, source index, and Tejas decision queue. Rewrote active roles to Tejas
  orchestrator / Claude backend / Codex frontend-deploy-polish.
- **Verified:** all required docs exist and are non-empty; `git diff --check`
  passes after whitespace cleanup; repository status shows no changes in
  `contracts/`, `ui/src/`, or `packages/abi/`; sources are direct official URLs.
- **Docs updated:** doc map, architecture, legacy demo pointer, roles, agent
  configs, sync protocol, README, lane board, session coordination, evidence.
- **Material finding:** current proof-of-concept registration can be overwritten
  by another self-declared principal; BE-1 must harden identity lifecycle before
  deployment.
- **Remains:** Tejas answers `OPEN-QUESTIONS.md` in OP-1, then authorizes BE-1,
  ENV-1, and FE-1 according to the dependency graph.

## 2026-07-25 — MG-1 — Hackathon MVP and repository bootstrap

- **Owner:** Codex
- **Read:** hackathon co-dev brief; `docs/PRODUCT.md`;
  `docs/ARCHITECTURE.md`; `docs/DEMO.md`; Vibe Coding Kit method, sync, roles,
  lifecycle, and doc-system contracts.
- **Changed:** built the React/TypeScript demo, ethers wallet/live integration,
  Solidity gate contract and Foundry tests, ABI/address handoff, deployment
  script, pitch runbook, and complete Vibe Coding Kit control plane.
- **Verified:** `npm run build` passed with TypeScript and Vite; headless Chrome
  loaded meaningful content with no Vite error overlay; the 100 MON attempt
  rendered `Action denied`; one-click correction set 5 MON; the retry rendered
  `Action attested` and a clearly labeled demo receipt. Canonical
  `TRANSFER_MOCK` action ID was checked against ethers.
- **Docs updated:** `PRODUCT.md`, `ARCHITECTURE.md`, `DEMO.md`, `DOC-SYSTEM.md`,
  lane board, session coordination, and this evidence log.
- **Published:** initial `main` branch pushed to
  `Taurus-Ai-Corp/MONAD-Gate-`.
- **Remains:** deploy `MonadGate.sol` to Monad Testnet, place the address in
  `packages/abi/addresses.json` and `ui/.env`, fund a burner agent wallet, and
  record the live explorer-proof backup video.

## 2026-07-25 — OP-1 — Operator decisions

- **Owner:** Tejas (recorded by Claude)
- **Read:** `docs/DOC-SYSTEM.md`, `docs/AGENT-SYNC-PROTOCOL.md`, `docs/ROLES.md`,
  `docs/ARCHITECTURE.md`, `docs/OPEN-QUESTIONS.md`,
  `docs/IMPLEMENTATION-LANES.md`, `control-plane/ACTIVE_LANE_BOARD.md`,
  `control-plane/SESSION_COORDINATION.md`, `AGENTS.md`, `CLAUDE.md`.
- **Decided:** Q1 principal-controlled rotation/deactivation, no agent kill
  switch; Q2 two burners (deployer+principal, agent), principal never equals
  agent; Q3 preconfigured demo state, setup runnable live on request; Q4
  MonadVision primary; Q5 existing box Cloudflare account on `*.pages.dev`, no
  custom domain; Q6 lane branches merged by PR; Q8 abstract policy units, no MON
  figures displayed; Q9 duplicate `resultHash` rejected. Q13 added and answered:
  no off-chain datastore in the MVP.
- **Defaulted, not explicitly confirmed:** Q7 attestation-only, Q10 two-stage
  confirmation, Q11 one demo laptop with two profiles, Q12 keep current visual
  identity. Each is marked as such in `OPEN-QUESTIONS.md` and may be overridden
  without reopening a lane.
- **Changed:** `docs/OPEN-QUESTIONS.md` (all answers), `docs/ARCHITECTURE.md`
  (identity lifecycle, replay, units, pending-interface note, deployment
  boundary), `docs/ROLES.md` (roster), `docs/IMPLEMENTATION-LANES.md` (lane
  reassignment), `AGENTS.md` (marked inactive), `CLAUDE.md` (sole build agent +
  verification rule), lane board, session coordination.
- **Verified:** `grep -c 'Codex' docs/IMPLEMENTATION-LANES.md` returns 0 — no
  lane still names a withdrawn owner. `git status --short` shows changes only
  under `docs/`, `control-plane/`, `AGENTS.md`, and `CLAUDE.md`; nothing in
  `contracts/`, `ui/src/`, or `packages/abi/`.
- **Note:** `git diff --check` reports trailing whitespace on the reassigned
  `Owner:` lines in `IMPLEMENTATION-LANES.md`. These are intentional markdown
  hard breaks matching every other field in those lane blocks; stripping them
  would collapse Owner/Reading/Acceptance into one rendered paragraph. Left as
  is deliberately — the check is not clean on this file and that is expected.
- **Roster change:** Codex withdrew (budget exhausted). Its surfaces transferred
  to Claude. **No independent verifier remains** — this is a real reduction in
  assurance, recorded rather than papered over. Mitigation: acceptance checks
  must be mechanical and reproducible by Tejas.
- **Coordination finding:** Codex commit `f5c6908` and an uncommitted Claude
  edit overlapped in the shared checkout while `SESSION_COORDINATION.md` listed
  no active agent. Nothing was lost, but the isolation was accidental. Rule
  added: a second agent uses its own clone or worktree.
- **Remains:** Tejas works ENV-1 (fund two burners, record public addresses, no
  keys in repo). Claude works BE-1 starting with the rotation/deactivation
  function surface proposed into `ARCHITECTURE.md` for sign-off before any
  Solidity is written.

## 2026-07-26 — BE-1 — Contract authorization hardening

- **Owner:** Claude
- **Read:** `docs/BUILD-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`,
  `docs/LOCAL-DEVELOPMENT.md`, `docs/MONAD-DEPLOYMENT.md`,
  `docs/IMPLEMENTATION-LANES.md`, `contracts/src/MonadGate.sol`,
  `contracts/test/MonadGate.t.sol`.
- **Method:** proposed the interface into `ARCHITECTURE.md` first (commit
  `ce7ccd8`), then committed five FAILING tests (`58294ac`, red run) before
  touching the contract, so the fix is evidenced by red→green rather than by
  assertion.
- **Reproduced the flaw:** against the pre-BE-1 contract,
  `[FAIL: SEIZED: unrelated caller overwrote a registered agent]` and
  `[FAIL: ESCALATED: attacker raised the spend cap after seizing the agent]`.
  `registerAgent` checked only `msg.sender == principal`, which any caller
  satisfies by naming itself, and never checked prior registration.
- **Changed:** `contracts/src/MonadGate.sol` — added `AgentAlreadyRegistered`,
  `PrincipalIsAgent`, `ResultAlreadyAttested`, `attestedResult` mapping,
  `transferPrincipal`, `rotateAgent`, `PrincipalTransferred`, `AgentRotated`;
  replay check ordered after all policy checks. `contracts/test/MonadGateAuth.t.sol`
  — 11 new tests across two suites.
- **Verified:** `forge test` → 14 passed, 0 failed, 0 skipped (3 pre-existing
  tests still green, so no regression). `forge build` clean under
  Solc 0.8.24. `forge fmt --check` clean.
- **Found beyond the brief:** (1) policies survived re-registration — latent
  before, live once rotation existed; handled in `rotateAgent`. (2)
  `ActionAttested` omits the nonce `SECURITY.md` requires it to bind, so
  `attestationId` is not recomputable off-chain — the verifiability claim does
  not currently hold; opened as BE-1b. (3) `forge fmt --check` was already
  failing before this lane on untouched code and would have blocked BE-3's
  pre-broadcast gate; normalized.
- **Known limitation, tested not hidden:** `attestedResult` is keyed
  `(agent, resultHash)`, so `rotateAgent` gives an identity an empty replay set
  and a previously attested hash can be reused.
  `testRotationResetsReplayProtection` passes and documents this. Global keying
  closes it but allows cross-agent griefing. Operator decision, one line either
  way.
- **Scope call:** nonce-in-event deferred to BE-1b because it is the only
  breaking ABI change in the proposal; everything shipped here is additive, so
  a client built against the pre-BE-1 ABI still works.
- **Process note:** the proposal asked for sign-off before implementation and
  Tejas gave a go-ahead on the lane rather than clause-by-clause approval.
  Proceeded on the written proposal under operator-instruction precedence. Two
  items remain confirmable and cheap to reverse: the replay key and the absence
  of a `deactivateAgent` function.
- **Environment:** Monad Foundry `1.7.1-monad-v1.0.0` installed via the
  documented `foundry.category.xyz` script, after inspecting it (2.2KB, fetches
  `foundryup` from `github.com/category-labs/foundry` branch `monad`).
- **Docs updated:** `docs/ARCHITECTURE.md` (frozen interface now includes both
  rotation functions; implementation record; known limitation),
  `docs/SECURITY.md` (per-control status, the unmet nonce control stated
  plainly), lane board, this log.
- **Remains:** Tejas works ENV-1. BE-1b (nonce in event, breaking ABI + UI).
  BE-2 (fuzz/invariant/gas suite; decide whether to adopt `forge-std` over the
  hand-rolled `Vm` interface). Nothing is deployed — all evidence is local.

## 2026-07-26 — ENV-1 — Burner wallets

- **Owner:** Tejas, executed by Claude on operator instruction.
- **Read:** `docs/SECURITY.md`, `docs/MONAD-DEPLOYMENT.md`,
  `docs/OPEN-QUESTIONS.md` Q2, official Monad gas-pricing and reserve-balance
  pages.
- **Changed:** generated two distinct burners as encrypted Foundry keystores
  (`monad-deployer`, `monad-agent`) with random 32-byte passwords stored 0400
  outside the repo; recorded the public addresses in
  `packages/abi/addresses.json`; documented handling in `docs/SECURITY.md`;
  funded both wallets. Added `tools/sheet_sync.py`, a one-way publisher of the
  control plane to the operator Google Sheet.
- **Verified:** `cast chain-id` returns 10143 from the foundation RPC; both
  keystores decrypt with their stored password files; principal != agent;
  funding tx `0xef9933cfb0de37548e0875116365a97526a5ad1ba9ebd96abbdf01e5128f9491`
  landed in block 48032490 with status 1; post-transfer balances read from chain
  are 34.9978 MON (deployer/principal) and 15.0000 MON (agent); `git ls-files`
  shows no keystore, password, or key file tracked in any of the three mirrors.
- **Costed the demo from measurements, not guesses:** `forge test --gas-report`
  gives deploy 914,621 gas, `registerAgent` 92,612, `setPolicy` 95,520,
  `executeGated` 81,316 allow / 24,758 deny. Monad charges the **gas limit, not
  gas used**, so BE-3 should set limits explicitly rather than let a wallet pad
  them. One full deploy+setup cycle costs ~0.146 MON at 102 gwei; the 34.99 MON
  on the deployer is roughly 230 redeploys of headroom.
- **Material finding:** ENV-1's stated acceptance also required "Cloudflare can
  access GitHub". That half was never started and blocks a different lane
  (DEP-1, not BE-3), so it was split into ENV-2 rather than held closed
  dishonestly or left blocking the chain path.
- **Operator decision recorded:** Tejas directed that generated wallets and
  secrets also be mirrored in the clear to the private operator sheet. The old
  `SECURITY.md` claim that keys never leave the keystore was false once that
  landed, and was amended rather than left standing. The limit is written into
  the doc: testnet burners only, never a mainnet key or a token with real blast
  radius.
- **Docs updated:** lane graph (ENV-1 narrowed, ENV-2 added, DEP-1 dependency),
  lane board, session coordination, `SECURITY.md`, `DOC-SYSTEM.md` (generated
  views), this log.
- **Remains:** BE-3 may now deploy. ENV-2 (Cloudflare/GitHub) unstarted. BE-1b
  and BE-2 unchanged.

## 2026-07-26 — BE-3 — Deployment and ABI export

- **Owner:** Claude, on operator instruction.
- **Read:** `docs/MONAD-DEPLOYMENT.md`, `docs/BUILD-SPEC.md`,
  `docs/ARCHITECTURE.md`, `docs/SECURITY.md`.
- **Pre-broadcast gates, all green:** `forge fmt --check` clean, `forge clean`
  + `forge build` successful, `forge test` 14 passed / 0 failed. Simulated
  without `--broadcast` first: chain 10143, 1,199,511 gas, 0.2459 MON estimated.
- **Changed:** deployed `MonadGate` to Monad testnet; regenerated
  `packages/abi/gate.json` from the compiler artifact; recorded the full
  deployment in `packages/abi/addresses.json`; pinned the testnet RPC in
  `foundry.toml` so `--rpc-url monad_testnet` resolves from config.
- **Verified, not assumed:** deployed bytecode fetched with `cast code` is
  byte-identical (7,968 chars) to `deployedBytecode.object` in the local
  artifact — what is on chain is what this repo builds. A read call through the
  regenerated ABI returns the expected unregistered state for the agent
  address. `actionIdTransferMock` in the manifest equals `cast keccak
  "TRANSFER_MOCK"` and equals the UI's `id("TRANSFER_MOCK")`, so contract, UI,
  and manifest agree on the action being gated.
- **Address:** `0x7feaAb7D9634E6F614e28a42E800E6a7237d37C2`, deploy tx
  `0xe8d138528b0620917745415599d10ac544298c4269e93e7c8b2b0d65406875ee`,
  block 48036909, deployer `0xae06174FFd44850FAC43cf8F7D0ECB0848678071`,
  cost 0.126 MON. Deployer balance after: 34.8719 MON.
- **Material finding:** `gate.json` was a hand-written 4-function subset, which
  `MONAD-DEPLOYMENT.md` forbids for a deployed ABI. Regenerating it added the 5
  events and 9 custom errors, which FE-2/FE-3 need in order to show a decoded
  revert rather than a bare selector. The old surface was a strict subset, so
  the regeneration could not break existing UI calls — checked signature by
  signature before overwriting.
- **Scope held:** source verification and the `cast` deny/pass proof are BE-4,
  not this lane. `sourceVerified` is recorded as `false` and no claim of
  verification is made anywhere.
- **Standing risk:** BE-1b alters `ActionAttested`. It is the one breaking ABI
  change outstanding, so it invalidates this address and every recorded value.
  Deploying before it was an operator decision; a redeploy costs 0.126 MON and
  about two minutes.
- **Docs updated:** `ARCHITECTURE.md`, address manifest, ABI, lane board,
  session coordination, this log.
- **Remains:** BE-4 (verify source on MonadVision/Sourcify, reproduce
  register/policy/deny/pass with `cast`). FE-2/FE-3 can now point at a real
  address — set `VITE_GATE_ADDRESS=0x7feaAb7D9634E6F614e28a42E800E6a7237d37C2`
  in `ui/.env.local`. ENV-2, BE-1b, BE-2 unchanged.
