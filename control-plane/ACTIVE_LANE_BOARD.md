# Active Lane Board

> The single live queue. Lanes move: OPEN → CLAIMED → IN PROGRESS → IN VERIFICATION → CLOSED.
> Format + rules: see docs/LANE-LIFECYCLE.md.

## Active

### FE-3-SIGN — In-page signing path (untested) [OPEN]

Owner: Claude
Opened: 2026-07-26
Depends on: BE-4 (closed)
Acceptance: distinct agent shows real over-cap denial, successful attestation,
and explorer proof; simulated hash never appears live
Notes: the UI now reads identity and policy from the deployed contract on load
and evaluates every action against it.

Verified on the deployed site:

- identity and policy are real — the page renders label "Atlas", agent
  `0xd00e…2030`, principal `0xae06…8071`, cap 10, active, all read from chain;
- the denial is **the contract's own decision**, not a local guess. Running 100
  against the cap issues an `eth_call` to the deployed contract and renders the
  decoded custom error `SpendCapExceeded(100, 10)`;
- with 5 units the contract allows it and the UI asks for the agent wallet
  instead of inventing a result — no simulated hash appears anywhere on the live
  path (asserted in the DOM, not eyeballed);
- console clean, no horizontal overflow at 375 px.

**Not yet verified, and the reason the lane is not closed:** the successful
attestation and its explorer link need the agent key signing in a browser
wallet. That cannot be done headlessly, so a human must run it once — import
the agent burner into MetaMask on Monad testnet, set 5 units, click through, and
confirm the receipt links to the tx on MonadVision. The same path already
succeeded via `cast` in BE-4, so the contract side is proven; what is unproven
is the browser signing path.

### FE-2 — Principal setup flow [IN VERIFICATION]

Owner: Claude
Opened: 2026-07-26
Depends on: ABI freeze (done)
Acceptance: correct-chain wallet can register and set/pause policy; UI shows
submission, receipt, and decoded errors
Notes: shipped as a collapsed "Principal controls" panel. Q3 preconfigures the
demo, so this must not compete with the demo path — but Q3 also says setup stays
runnable live if judges ask, which is why it exists at all.

Verified on the deployed site without a wallet:

- collapsed by default; the demo path is unchanged (100 units still returns a
  real `SpendCapExceeded(100, 10)` from the contract);
- fields prefill from chain state — agent `0xd00e…2030`, label Atlas, cap 10;
- with no wallet: "Connect the principal wallet to register or change policy";
- a connected non-principal is warned by address that the contract will reject
  the write with `NotPrincipal`, before spending gas to find out;
- writes go through a shared path that connects, asserts chain 10143, shows
  Included with the tx hash and explorer link, then Confirmed, then re-reads
  chain state; failures render the decoded custom error, not a raw selector;
- console clean, no MON strings anywhere in the page.

**Not verified, and why the lane is not closed:** registering and pausing are
writes, so they need the principal key signing in a browser wallet. Same gap as
FE-3 — one human run closes both. Pausing then resuming is the cheapest check
and it exercises `setPolicy` in both directions.

### DEMO-1 — Pitch and fallback pack [IN PROGRESS]

Owner: Claude, with Tejas owning the recording
Opened: 2026-07-26
Depends on: VER-1 (not met — run early on operator instruction)
Acceptance: live talk track under 90 seconds, backup video on two devices,
URLs/addresses/README ready
Notes: talk track rewritten against what actually shipped and timed — 176 spoken
words, about 70 seconds at 150 wpm, leaving room for clicks. Preflight is now
copy-pasteable `cast` commands with expected values. Evidence card carries real
addresses and tx hashes. Q&A expanded to cover what a judge can now actually
check: that the denial is the contract's own, that the attestation id is
recomputable from the log, and the rotation replay limit.
`DEMO.md` retired into `DEMO-OPERATIONS.md` — it held a second copy of the talk
track that still said "100 MON" and "Set amount to 5 MON", against OP-1 Q8 and
the shipped UI. That drift is the reason the rule exists, so it is written up in
`DOC-SYSTEM.md` as the worked example.
**New in the fallback ladder:** a deny-only level. The refusal is an `eth_call`,
so if the wallet or the agent balance fails on stage, the denial half of the
story is still genuinely live.
**Remaining, and it is Tejas:** record the fail-to-pass run and put it on two
devices. Cannot be done before the wallet path has been run once — see FE-3.

### FE-4 — Responsive and accessibility polish [OPEN]

Owner: Claude
Opened: 2026-07-26
Depends on: FE-2, FE-3
Acceptance: projector, 375 px phone, keyboard, focus, contrast, disabled/loading,
and reduced-motion checks pass
Notes: opened with one defect already found and fixed during FE-2 — see that
lane's evidence. `.app-shell` sets `overflow: hidden`, so overflowing content is
clipped instead of producing a horizontal scrollbar, and grid items defaulted to
`min-width: auto`. Panels rendered 438 px wide inside a 351 px column: at 375 px
roughly 75 px of every panel was cut off, including the identity addresses.
Fixed. The rest of the acceptance list — keyboard, focus order, contrast,
projector — is untested.

## Recently closed

- **FE-9 — Full refusal surface and deck link** [CLOSED 2026-07-26] — the attack
  panel now carries **five scenarios**, every one verified against the deployed
  contract with zero allowed:
  self-escalation → `NotPrincipal`; liability assigned without consent →
  `NotPrincipal`; undelegated action → `ActionNotAllowed`; replayed result →
  `ResultAlreadyAttested`; and a boundary walk at cap-1 / cap / cap+1 that
  returns allowed, allowed, `SpendCapExceeded(11, 10)`.
  All are `eth_call` — no wallet, no gas, nothing written.
  Two details worth keeping: the undelegated action uses the **real**
  `keccak("DRAIN_TREASURY")` rather than the placeholder the source branch
  hardcoded, and the replay scenario reuses the result hash from the BE-1b proof
  transaction, which is permanently spent on chain so the demo works at any time
  without first burning a fresh one.
  Deck is now reachable from the header (`/deck`), verified 200. No horizontal
  clipping at 375 px.
  Only `PolicyInactive` remains undemonstrated in the UI: showing it means
  pausing the live policy, which is a state change and belongs in Principal
  controls, not in a read-only panel.

- **FE-8 — Attack scenarios and deck** [CLOSED 2026-07-26] — ported the two
  strongest ideas from the `feat/demo-site` branch on the other repo, rebuilt
  against **our** contract rather than copied.
  **Attack surface panel:** a compromised agent raising its own cap, and a
  stranger naming someone else as the liable principal. Both run as `eth_call`,
  so they cost nothing, write nothing and need no wallet. Verified on the
  deployed contract — both return `NotPrincipal()`, zero allowed.
  These matter because the cap answers *how much* while these answer *who
  decides*, which is what a compromised agent actually attacks.
  **Deck** at `/deck.html` — six slides, keyboard and scroll-snap, our palette,
  no bundle changes.
  Two factual errors in the source were corrected rather than inherited: it said
  "four ways to be refused" when the contract has six distinct refusals, and it
  claimed post-quantum signatures and Hedera anchoring were "specified, not
  built" when neither is specified anywhere in either repo. The deck now says
  *not built, and not designed either*.
  Also verified and rejected their premise for switching explorers: MonadVision
  and MonadScan both 403 a `curl`, and MonadVision loads the transaction fine in
  a real browser. Q4 stands.

- **FE-2-FIX — Empty principal on first setup click** [CLOSED 2026-07-26] —
  found by Tejas running the real wallet flow: **Register agent** failed with
  `UNCONFIGURED_NAME (value="")`. Cause was a stale closure — the button passed
  the `wallet` React state, which is still empty on the first click because
  `runSetup` connects the wallet *after* that closure was created. Ethers took
  the empty string for an ENS name and produced an unreadable error.
  Fixed by threading the freshly connected address into the callback and never
  reading the state there, plus address validation before connecting so bad
  input fails fast without a wallet popup.
  **Verified by capturing the calldata**: `registerAgent` now sends
  `argPrincipal = the connected account` where it previously sent an empty
  string. Blank input renders "Agent address is not a valid address."
  Also cleaned wallet-level errors — a rejection now reads "Rejected in the
  wallet." instead of a paragraph of ethers JSON, which matters on a projector.
  Side effect worth noting: this exercised the in-page signing path end to end
  up to the signature for the first time, which materially de-risks FE-3-SIGN
  without closing it.

- **FE-7 — Attestations read from chain** [CLOSED 2026-07-26] — the page polls
  `ActionAttested` logs for the agent and renders them, **and recomputes the
  attestation id from the event to check it matches** before showing a verified
  badge. Verified end to end headlessly: with the page open and empty, an
  attestation written from `cast` (tx `0x1ae8b803…7430`) appeared within seconds
  reading `ATTESTED · 5 units · nonce 1 · id verified from the log`, with a
  working explorer link and zero mismatches.
  This removes the browser-wallet dependency from the demo entirely: the agent
  signs from its own keystore, which is how an autonomous agent actually signs,
  and the page proves the result from chain.
  Note: the public RPC caps `eth_getLogs` at a 100-block range, so this is a
  rolling recent window, not full history. That is what a live demo needs, and
  the empty state says so.
- **FE-3 — Agent fail/pass flow** [CLOSED 2026-07-26] — acceptance met without a
  browser wallet. A distinct agent shows a real over-cap denial (contract
  `eth_call`, `SpendCapExceeded(100, 10)`), a successful attestation (surfaced
  from chain by FE-7, id independently verified in the page), and explorer
  proof. No simulated hash ever appears on the live path — asserted in the DOM.
  Recorded rather than buried: **the in-page signing path has never been
  exercised.** It is no longer on the demo track so it blocks nothing, but it is
  untested code — tracked as FE-3-SIGN.

- **ENV-2 — Cloudflare and GitHub access** [CLOSED 2026-07-26] — Tejas
  authorised the Cloudflare GitHub App. Project `monad-gate` is bound to
  `floating-astronaut/monad-priject`, production branch `main`, root `ui`, build
  `npm run build`, output `dist`, previews enabled for all branches. Verified
  through the Cloudflare API, not the dashboard screenshot.
- **DEP-1 — Cloudflare preview** [CLOSED 2026-07-26] — every acceptance item
  met and checked against the live site:
  Git build from `ui/` — production deployment `831d98c6` built from `main`
  `c862d6a`; **per-branch preview proven** — pushing `lane/dep-1-close` produced
  preview `2d078df8` automatically.
  Public env correct — the served bundle carries the live contract
  `0x6e93CE34…F908` and zero occurrences of the superseded address; a local
  build of `main` produces byte-identical asset hashes, so production is
  reproducible from the repo.
  SPA fallback — `/` and a deep link both return 200 with the app shell.
  Console — clean, no errors, no Vite overlay.
  ⚠️ **Known limitation, accepted:** a request for a missing file under
  `/assets/` returns the SPA shell with status 200 rather than a 404. Two fixes
  were tried and both failed on Cloudflare Pages: a `404` status rule in
  `_redirects` is ignored unless it targets a literally-named `404.html`, and
  adding `404.html` makes Pages serve it for *all* unmatched paths, which breaks
  the SPA fallback. Getting both behaviours needs a Pages Function, and
  `ARCHITECTURE.md` plus the Worker decision gate in `CLOUDFLARE-DEPLOYMENT.md`
  say no Worker without Tejas approving one. Impact is small: the app has no
  client-side router and ships a single unsplit bundle, so a stale asset request
  means a full page load, which fetches the current `index.html` anyway.

- **BE-2 — Foundry verification suite** [CLOSED 2026-07-26] — 38 tests, 0
  failures, up from 17. Added boundary cases (at cap, one above, zero amount,
  zero cap), every rejection path, `expectEmit` assertions on all three events,
  7 fuzz properties, and **2 stateful invariants** driven by a handler at
  128,000 calls per run: the nonce equals the number of actions the contract
  actually accepted, and identity never changes under arbitrary agent activity.
  Gas snapshot committed at `contracts/.gas-snapshot`; `forge snapshot --check`
  is now a gate. Fuzz/invariant runs pinned in `foundry.toml`.
  **Decision the board asked for:** adopted `forge-std`, pinned at v1.16.2 as a
  submodule. Three test files each declared their own partial `Vm` interface and
  had already drifted; that cost was going to compound as the suite grew. Clones
  now need `--recurse-submodules`, which is documented.
  Also corrected the clone URL in `LOCAL-DEVELOPMENT.md`, which still pointed at
  the repo this project no longer works in.
- **BE-1b — Attestation nonce in event** [CLOSED 2026-07-26] — `ActionAttested`
  now carries the nonce, so `attestationId` is recomputable off chain from the
  log alone. Three new tests, all red against the previous contract and green
  against this one. Forced a redeploy, done in full: new contract
  `0x6e93CE34DB89Cf14C1846Ea65967f5506477F908` (tx `0x047764f4…f1a1`, block
  48042025), bytecode byte-identical to the artifact, source verified
  `exact_match` (match 544618), demo state re-registered, deny/pass re-proved,
  ABI re-exported, UI redeployed. The old address `0x7feaAb7D…37C2` is
  superseded and recorded as such in the manifest.
  **Proved against the live chain, not only in tests:** the id recomputed off
  chain from the emitted event equals the id in the log.
- **BE-4 — Explorer verification and CLI proof** [CLOSED 2026-07-26] — source
  verified on Sourcify, `runtimeMatch: exact_match`, match 544617. Full story
  reproduced with `cast` against the live contract: principal registered agent
  "Atlas" (`0xf8b86a23…c8c0`), set cap 10 on `TRANSFER_MOCK`
  (`0x0698117d…1dbb`), agent's 100-unit attempt reverted
  `SpendCapExceeded(100, 10)`, agent's 5-unit attempt succeeded
  (`0x06366487…f982`) emitting `ActionAttested` bound to agent, principal,
  action, amount and result hash. Demo state is now preconfigured on chain per
  OP-1 Q3. Explorer URLs recorded in the manifest.
  ⚠️ **Superseded 2026-07-26.** Every address, tx and verification in this entry
  belongs to the pre-BE-1b contract and is dead. BE-1b landed the nonce, so the
  closing sentence of this entry — that `attestationId` is not recomputable off
  chain — is no longer true. Live values are in `packages/abi/addresses.json`.
- **FE-6 — Amounts read as policy units** [CLOSED 2026-07-26] — every amount in
  the UI is now labelled in policy units: the cap field, the action input, the
  slider bounds, the denial copy, the attestation receipt and the audit strip.
  The only remaining "MON" strings are the MONAD wordmark and one deliberate
  disclaimer, "Policy units, not MON — no value moves." Verified against the
  deployed page text, so OP-1 Q8 now holds where a judge can actually see it.
- **BE-3 — Deployment and ABI export** [CLOSED 2026-07-26] — `MonadGate`
  deployed to Monad testnet at `0x7feaAb7D9634E6F614e28a42E800E6a7237d37C2`,
  tx `0xe8d138528b0620917745415599d10ac544298c4269e93e7c8b2b0d65406875ee`,
  block 48036909, 1,199,511 gas, 0.126 MON. Dry run first, then broadcast.
  Deployed bytecode is byte-identical to the local artifact. `gate.json`
  regenerated from the artifact; `addresses.json` records chain, contract, tx,
  block, deployer, solc 0.8.24, optimizer 200, forge version, commit, and ABI
  sha256. **Not source-verified yet — that is BE-4.**
  ⚠️ **Superseded 2026-07-26.** BE-1b landed the breaking `ActionAttested`
  change and this address was redeployed as
  `0x6e93CE34DB89Cf14C1846Ea65967f5506477F908`. Everything in this entry is
  history — the address is dead and must not be shown to judges. The live
  values, including the Sourcify verification this entry says is pending, are in
  `packages/abi/addresses.json`, which also records the supersession.
- **ENV-1 — Burner wallets** [CLOSED 2026-07-26] — two distinct burners
  generated as encrypted Foundry keystores and funded. deployer/principal
  `0xae06174FFd44850FAC43cf8F7D0ECB0848678071` holds 34.9978 MON, agent
  `0xd00e55Da854b53F02Ff0fe8DD6a35f68a14E2030` holds 15.0000 MON, both above the
  10 MON `user_reserve_balance` threshold. 50 MON claimed to the deployer, 15
  forwarded in tx `0xef9933cfb0de37548e0875116365a97526a5ad1ba9ebd96abbdf01e5128f9491`
  (block 48032490, status 1). No key in Git. **BE-3 is unblocked.** Cloudflare
  access moved to ENV-2.
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
