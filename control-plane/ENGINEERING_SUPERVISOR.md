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

## 2026-07-26 — BE-4 — Explorer verification and CLI proof

- **Owner:** Claude. Worked on lane branch `lane/be-4-verify-and-prove` after
  Tejas flagged that BE-3 and the ENV-1 close had gone straight to `main`,
  against OP-1 Q6.
- **Read:** `docs/MONAD-DEPLOYMENT.md`, `docs/TESTING.md`, `docs/SECURITY.md`,
  `docs/OPEN-QUESTIONS.md` Q3/Q8/Q9.
- **Source verification:** `forge verify-contract` against the Monad Sourcify
  endpoint. Job `b0288c97-a865-4227-923e-38b26627bc85` completed with
  `runtimeMatch: exact_match`, match id 544617, verified 2026-07-25T18:04:46Z.
  `creationMatch` is null — runtime bytecode is proven to match the source,
  creation bytecode was not matched. Stated as-is rather than rounded up to
  "fully verified".
- **Chain proof, reproduced end to end with `cast` against the live contract:**
  1. principal registered agent "Atlas" — tx `0xf8b86a23…c8c0`, `AgentRegistered`;
  2. principal set cap 10 on `TRANSFER_MOCK`, active — tx `0x0698117d…1dbb`;
  3. read-back confirms principal, label, registered=true, cap=10, action id,
     active=true;
  4. agent attempted 100 against the cap — reverted `SpendCapExceeded(100, 10)`,
     selector `0x605cd727` decoded, run as `cast call` so no gas was burned;
  5. agent attempted 5 — tx `0x06366487…f982`, status 1, 124,348 gas;
  6. receipt carries `ActionAttested` with topic0
     `0x0293aa86…7aa8`, matching `cast keccak` of the event signature, binding
     agent `0xd00e55…2030`, principal `0xae0617…8071`, action
     `0x51eb1c38…cdc1`, amount 5, and the result hash.
- **Demo state is now live and preconfigured** per OP-1 Q3, so registration and
  policy stay off the critical path of a timed pitch. Amounts are abstract
  policy units per Q8; no MON moved in any of these transactions.
- **Known gap restated, not quietly dropped:** `ActionAttested` still omits the
  nonce, so `attestationId` cannot be recomputed off-chain from the event alone.
  That is BE-1b, and it remains a breaking ABI change that would invalidate this
  address, this verification, and the demo state recorded above.
- **Process correction:** this lane ran on a branch and goes to `main` via PR,
  which is what Q6 required all along.
- **Docs updated:** address manifest (verification block, demo state, proof
  block, explorer URLs), lane board, session coordination, this log.
- **Remains:** ENV-2 and DEP-1 (Cloudflare), FE-2/FE-3 can now point at a real
  verified contract with live demo state, BE-1b, BE-2.
## 2026-07-26 — DEP-1 (partial) — Cloudflare Pages first deployment

- **Owner:** Claude, on lane branch `lane/dep-1-cloudflare-preview`.
- **Read:** `docs/CLOUDFLARE-DEPLOYMENT.md`, `docs/OPEN-QUESTIONS.md` Q5/Q8,
  `docs/IMPLEMENTATION-LANES.md` kill switches.
- **Changed:** built `ui/` against the live contract config, added
  `ui/public/_redirects` for SPA fallback, created Pages project `monad-gate`,
  deployed `dist` by direct upload. Corrected the repository name in the
  Cloudflare runbook — it named `Taurus-Ai-Corp/MONAD-Gate-`, which is not the
  working repo. Recorded the deployment in the runbook and the manifest.
- **Verified in a real browser, not by assumption:** `/` returns 200; a deep
  link returns 200 and serves the SPA shell; the served bundle is
  byte-identical to the local build and carries the deployed address; console
  is clean — no errors, no Vite overlay; the page renders fully.
- **Deliberate use of the documented kill switch:** Git-connected Pages needs
  the Cloudflare GitHub App authorized in the dashboard, an interactive OAuth
  flow no agent can complete headlessly. `IMPLEMENTATION-LANES.md` already
  anticipated this ("Claude direct-uploads `ui/dist` with Wrangler"), so that
  path was used rather than inventing one. ENV-2 still owns the Git connection.
- **Lane deliberately left open.** DEP-1's acceptance says *Git* preview builds,
  and it depends on FE-3, which is not done. Both are unmet. Marking it closed
  because a URL resolves would have been the easy lie.
- **Material finding, judge-facing:** the deployed UI labels policy amounts in
  MON — "100 MON", "CAP 10", "120 MON", "Run the 100 MON action first". OP-1 Q8
  answered this the other way: amounts are abstract policy units and "no MON
  figures are displayed ... so no judge can conclude that value moved." The
  shipped UI contradicts an answered operator decision, and it is precisely the
  misreading Q8 existed to prevent. Opened as FE-6.
- **Second finding:** the page is still in safe demo mode with placeholder
  actors despite `VITE_GATE_ADDRESS` being baked in, so it currently proves
  nothing about the chain. It does disclose "Safe demo mode · no funds will
  move", which satisfies the `SECURITY.md` demo-truth rule. Wiring live state
  is FE-2/FE-3.
- **Remains:** ENV-2 (dashboard OAuth, Tejas), FE-2/FE-3 (live wiring), FE-6
  (units), then DEP-1 can actually close.

## 2026-07-26 — FE-3 + FE-6 — Live agent flow and policy units

- **Owner:** Claude, lane branch `lane/fe-3-fe-6-live-wiring` (stacked on DEP-1).
- **Read:** `docs/BUILD-SPEC.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`
  demo truth, `docs/OPEN-QUESTIONS.md` Q3/Q7/Q8/Q10.
- **The substantive change:** the deny decision is no longer computed in the
  browser. `simulateGate()` issues an `eth_call` to the deployed contract with
  `from` set to the agent, so the node evaluates real policy against real state
  and the UI renders the contract's own custom error. Previously the UI compared
  two numbers in JavaScript and printed a hardcoded `SpendCapExceeded(...)`
  string — it would have shown a denial even against a contract that allowed the
  action, which is the one thing this demo must never do.
- **Also:** identity and policy are read from chain on load with no wallet, so
  judges see real state immediately; the demo toggles that would contradict
  chain state are disabled in live mode; the manifest is now the source of truth
  for addresses with `VITE_*` as override, so a build cannot disagree with what
  BE-3/BE-4 recorded; submitted and confirmed are two distinct receipt states per
  Q10.
- **Verified on the deployed site, in a browser:** renders label "Atlas", agent
  `0xd00e…2030`, principal `0xae06…8071`, cap 10, active — all from chain. 100
  units returns `SpendCapExceeded(100, 10)` decoded from the real revert. 5 units
  is allowed by the contract and the UI asks for the agent wallet rather than
  fabricating a result. Asserted in the DOM that no `demo-` hash and no
  "Simulated attestation" string exists on the live path. Console clean. No
  horizontal overflow at 375 px. `tsc -b` green.
- **FE-6:** every amount now reads in policy units. The only "MON" strings left
  are the MONAD wordmark and the deliberate disclaimer "Policy units, not MON —
  no value moves". Q8 is now satisfied where a judge can see it, not just in a
  doc.
- **Honest gap:** the successful attestation and its explorer link were **not**
  verified end to end, because signing needs the agent key in a browser wallet
  and that cannot be driven headlessly. BE-4 proved the same contract path with
  `cast`, so the chain side is sound; the browser signing path is untested. FE-3
  is left IN VERIFICATION with the exact manual steps rather than closed on a
  partial check.
- **Docs updated:** lane board (FE-3 in verification, FE-6 closed), Cloudflare
  runbook, manifest hosting block, session coordination, this log.
- **Remains:** one human wallet run to close FE-3; ENV-2 for Git-connected
  previews; FE-2 (principal setup UI) still unbuilt but not on the demo path
  since Q3 preconfigures; BE-1b, BE-2.

## 2026-07-26 — BE-1b — Attestation nonce in event

- **Owner:** Claude, lane branch `lane/be-1b-attestation-nonce`.
- **Read:** `docs/SECURITY.md` contract controls, `docs/ARCHITECTURE.md`,
  `docs/MONAD-DEPLOYMENT.md`, `docs/OPEN-QUESTIONS.md` Q9.
- **Changed:** `ActionAttested` now carries the nonce; the nonce is captured
  into a local before the post-increment so the event and the id use the same
  value. Three tests added; `gate.json` re-exported from the artifact; the UI
  decodes the event and surfaces attestation id and nonce on the receipt.
- **Red first, then green:** the new tests were run against the pre-BE-1b
  contract restored from `git show HEAD:` — all three failed with
  "ActionAttested not emitted", because the old event's topic hash differs.
  Against the new contract all three pass. Suite: 17 passed / 0 failed.
- **The tests are about the claim, not the code:**
  `testAttestationIdIsRecomputableFromEventAlone` rebuilds the id using only log
  topics and data. `testNonceAdvancesAcrossAttestations` prevents two identical
  actions colliding. `testDeniedActionDoesNotConsumeNonce` guards the sequence a
  verifier reconstructs from developing unexplained gaps.
- **Redeploy done in full, not partially:** new contract
  `0x6e93CE34DB89Cf14C1846Ea65967f5506477F908`, tx `0x047764f4…f1a1`, block
  48042025, 1,196,933 gas. `cast code` byte-identical to the artifact. Source
  verified, `runtimeMatch: exact_match`, match 544618. Demo state re-registered
  (`0x4794f1ea…b2a9`, `0x0340bc52…1b42`). Deny re-proved
  `SpendCapExceeded(100, 10)`; pass re-proved `0x74f68eb7…b688`.
- **The claim proved against the live chain:** taking only the emitted log,
  `keccak256(abi.encode(chainId, contract, agent, principal, actionId, amount,
  resultHash, nonce))` recomputes to
  `0x2a3d83dca7d1544df1efa9cdd7968279786f2eb14d12122ad8a4b1cb299cc113`, exactly
  the id in the event. `SECURITY.md`'s verifiability control moves from **NOT
  met** to enforced, on evidence rather than assertion.
- **The manifest-as-source-of-truth change from FE-3 paid for itself:** the UI
  was rebuilt with no `VITE_GATE_ADDRESS` and picked up the new address from the
  manifest automatically. Verified the new address is in the bundle and the old
  one appears zero times, so no build can still point at the dead contract.
- **Verified on the deployed site:** it reads the new contract — label "Atlas",
  agent `0xd00e…2030`, principal `0xae06…8071`, cap 10 — and 100 units still
  returns a real `SpendCapExceeded(100, 10)` from the new deployment.
- **Docs updated:** `SECURITY.md` control status, lane board, manifest
  (deployment, verification, supersedes, demo state, proof, recomputation),
  ABI, this log.
- **Remains:** FE-3's one manual wallet run, now against the new address — and
  more worth doing than before, because the receipt will show the attestation id
  and nonce this lane added. ENV-2, BE-2, FE-2.

## 2026-07-26 — BE-2 — Foundry verification suite

- **Owner:** Claude, lane branch `lane/be-2-verification-suite`.
- **Read:** `docs/TESTING.md`, `docs/MONAD-DEPLOYMENT.md`,
  `docs/LOCAL-DEVELOPMENT.md`, the lane board's standing question about
  `forge-std`.
- **Decision the board asked BE-2 to make:** adopt `forge-std`, pinned at
  v1.16.2 as a git submodule. Three test files each declared their own partial
  `Vm` interface — one had `expectRevert()`, another `expectRevert(bytes)`, a
  third `recordLogs` — and they had already drifted. Every new cheatcode meant
  hand-editing an interface. The cost is that a clone now needs
  `--recurse-submodules`; that is documented in two places and is the smaller
  cost.
- **Suite: 38 tests, 0 failures** (was 17). Added boundary cases (amount exactly
  at cap, one above, zero amount, zero cap), every rejection path
  (`PolicyInactive`, `ActionNotAllowed`, `AgentNotRegistered`, `ZeroAddress`),
  `expectEmit` assertions on all three events including the BE-1b nonce field,
  and a case proving a denial does not consume the result hash — without which a
  corrected retry would be rejected as a replay.
- **7 fuzz properties**, each stated so a counterexample is a real finding:
  above-cap never attests for any cap and any amount; within-cap always attests;
  unregistered senders never attest; non-principals never mutate policy; action
  mismatch never attests; replay always rejected; registration cannot be seized.
- **2 stateful invariants, the strongest evidence in this lane.** A handler
  drives the gate with arbitrary amounts, wrong action ids and stranger callers.
  128,000 calls per run, and `attestationNonce` must equal the number of calls
  the contract actually accepted. This is what backs BE-1b: an attestation id is
  only reconstructible off chain if the nonce advances exactly on success, and a
  nonce that moved on a rejected call would leave gaps a verifier could not
  explain. The second invariant holds identity immutable under all of it.
- **Gas snapshot** committed at `contracts/.gas-snapshot` (37 entries).
  `forge snapshot --check` is now a documented gate, so an unexplained gas
  change fails rather than passing silently. Fuzz and invariant runs are pinned
  in `foundry.toml` so a run here and a run elsewhere mean the same thing.
- **Migration was faithful, not a rewrite:** every original test name and
  assertion was preserved; `require(cond, msg)` became `assertTrue(cond, msg)`
  so failures report through forge-std. The 17 pre-existing tests still pass.
- **Found in passing:** `LOCAL-DEVELOPMENT.md` still told a new contributor to
  clone `Taurus-Ai-Corp/MONAD-Gate-`. Corrected, along with adding the submodule
  step. This is the second doc caught pointing at that repo.
- **Stated plainly in `TESTING.md`:** the frontend and browser test lists are
  still not automated. There is no test runner in `ui/` and adding one was not
  this lane; `npm run check` is the only automated frontend gate today.
- **Docs updated:** `TESTING.md` (suite status, clean-machine commands,
  requirement-to-test map), `LOCAL-DEVELOPMENT.md`, lane board, session
  coordination, this log.
- **Remains:** FE-3's one manual wallet run, ENV-2, FE-2. No backend lane is
  open.

## 2026-07-26 — FE-2 — Principal setup flow

- **Owner:** Claude, lane branch `lane/fe-2-principal-setup`.
- **Read:** `docs/BUILD-SPEC.md`, `docs/ARCHITECTURE.md`,
  `docs/OPEN-QUESTIONS.md` Q3/Q8/Q10, `docs/TESTING.md` frontend list.
- **Changed:** a collapsed "Principal controls" panel with register, set policy
  and pause/resume; a shared write path that connects, asserts chain 10143,
  reports Included with hash and explorer link, then Confirmed, then re-reads
  chain state so the rest of the page stops disagreeing with the contract;
  decoded custom errors on failure. New `assertCorrectChain` in `gate.ts`.
- **Kept off the demo path deliberately.** Q3 preconfigures registration and
  policy; the panel is collapsed and its summary line says so. Q3 also requires
  setup to remain runnable live for questions, which is the reason it exists.
- **Guards before gas:** a connected wallet that is not the stored principal is
  told so by address, with the error the contract would return, rather than
  discovering `NotPrincipal` after paying for a reverted transaction.
- **Verified on the deployed site without a wallet:** collapsed by default;
  fields prefill from chain state; correct guard copy with no wallet and with a
  non-principal wallet; demo path unchanged — 100 units still returns a real
  `SpendCapExceeded(100, 10)`; console clean; no MON strings in the page.
- **Not verified:** the writes themselves need the principal key in a browser
  wallet. FE-2 is left IN VERIFICATION rather than closed on the read-only half.
- **Defect found, and a correction to my own earlier evidence.** Checking the
  new panel at 375 px surfaced that `.app-shell` sets `overflow: hidden`, so
  overflowing content is clipped rather than producing a horizontal scrollbar.
  Grid items defaulted to `min-width: auto` and refused to shrink below
  min-content, so panels rendered 438 px wide inside a 351 px column — about
  75 px of every panel, including the identity addresses, was cut off on a
  phone. Pre-existing; FE-2 only surfaced it. Fixed with `min-width: 0` on the
  grid items and `overflow-wrap: anywhere` on address text; re-measured, nothing
  clipped.
  The correction: the FE-3 and FE-6 evidence above says "no horizontal overflow
  at 375 px". That statement was true as written but weaker than it sounded — it
  came from `documentElement.scrollWidth > innerWidth`, which **cannot** detect
  clipped overflow under `overflow: hidden`. It never proved the content fit.
  The check used here measures element bounding boxes against the viewport
  instead.
- **Docs updated:** lane board (FE-2 in verification, FE-4 opened with the
  diagnosis), session coordination, this log.
- **Remains:** one human wallet run closes FE-2 and FE-3 together — pause then
  resume the policy is the cheapest check and exercises `setPolicy` both ways.
  FE-4's keyboard, focus, contrast and projector checks are untested. ENV-2.
