# Active Lane Board

> The single live queue. Lanes move: OPEN → CLAIMED → IN PROGRESS → IN VERIFICATION → CLOSED.
> Format + rules: see docs/LANE-LIFECYCLE.md.

## Active

### FE-3 — Agent fail/pass flow [IN VERIFICATION]

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

### FE-6 — Amounts must read as policy units, not MON [OPEN]

Owner: Claude
Opened: 2026-07-26
Reading: `docs/OPEN-QUESTIONS.md` Q8, `docs/SECURITY.md` demo truth
Acceptance: no "MON" string appears next to a policy amount anywhere in the UI;
amounts render as policy units; the cap, the slider bounds, and the result copy
all agree
Notes: found during DEP-1 browser verification of the deployed site. The live
page currently renders "100 MON", "CAP 10", "120 MON" and "Run the 100 MON
action first". OP-1 Q8 answered this explicitly: amounts are **abstract policy
units**, "no MON figures are displayed and no decimal conversion exists
anywhere, so no judge can conclude that value moved." The deployed UI
contradicts that answer, and it is exactly the misreading Q8 was written to
prevent. Judge-facing, so worth fixing before the pitch.

### DEP-1 — Cloudflare preview [IN PROGRESS]

Owner: Claude
Opened: 2026-07-26
Depends on: FE-3 (not met — run early on operator instruction), ENV-2
Acceptance: Git preview builds from `ui/`, public env correct, SPA fallback and
console checks pass
Notes: site is **live** at https://monad-gate.pages.dev (deployment
`c6f2ae8b-5624-4750-8f71-196e8bfa9dd8`, source `fd798de`) by Wrangler direct
upload. SPA fallback works, bundle byte-matches the local build, console clean.
Two reasons the lane is not closed:
1. **Not Git-connected** — needs the dashboard OAuth in ENV-2, so no per-branch
   preview builds yet. Every deploy is manual from the box.
2. **The page is still in safe demo mode.** `VITE_GATE_ADDRESS` is baked into
   the bundle, but the UI shows the placeholder actors `0xA6E1…6E17` /
   `0xA11C…11CE`, not the real registered agent. Wiring it to the live contract
   is FE-2/FE-3. The page does disclose "Safe demo mode · no funds will move",
   so nothing on it is dishonest — but it is not yet proof of anything on chain.

### ENV-2 — Cloudflare and GitHub access [OPEN]

Owner: Tejas
Opened: 2026-07-26
Reading: `docs/CLOUDFLARE-DEPLOYMENT.md`, `docs/OPEN-QUESTIONS.md` Q5
Acceptance: the Cloudflare account named in OP-1 Q5 can build this repo from
Git; a Pages project exists and is bound to the correct branch
Notes: split out of ENV-1 on 2026-07-26 — see `docs/IMPLEMENTATION-LANES.md`.
Blocks DEP-1 only; nothing on the chain path waits on it. Unstarted. The
GitHub source is now mirrored three ways (private Taurus-Ai-Corp, private
GitLab, public floating-astronaut) — pick which remote Pages builds from
before wiring it.

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
  ⚠️ **This deployment is disposable.** BE-1b changes `ActionAttested`, which is
  a breaking ABI change, so landing BE-1b means redeploying and re-recording
  every value above. Do not put this address in front of judges as final until
  BE-1b is either landed or explicitly dropped.
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
