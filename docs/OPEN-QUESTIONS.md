# Operator Open Questions

Owner: Tejas  
Status: OP-1 answered 2026-07-25 — implementation authorized

Answers below are operator decisions. An agent may not change one silently; it
must reopen the question here and get an approved lane.

## Blocking

### Q1 — Identity lifecycle

Immutable registration, or current-principal rotation/revoke?

**Recommended:** current principal may rotate/deactivate; unrelated caller can
never overwrite.

**Answer:** Current-principal rotation/deactivation. Registration binds an agent
to a principal. Only the current principal may rotate that binding, change
policy, or deactivate. An unrelated caller can never overwrite an existing
registration — this closes the overwrite flaw recorded in
`ENGINEERING_SUPERVISOR.md` under DOC-1. No agent kill switch in the MVP.

The concrete function surface is BE-1 design work and must be written into
`ARCHITECTURE.md` before implementation, per the frozen-interface rule.

### Q2 — Wallet separation

Will principal and deployer be separate burners?

**Recommended:** separate if funded; otherwise one deployer/principal burner and
one distinct agent burner.

**Answer:** Two burners. One acts as deployer and principal; a second, distinct
burner is the agent. Principal must never equal agent — the visible authority
boundary is the demo.

### Q3 — Live setup

Should judges watch registration/policy transactions?

**Recommended:** preconfigure; show state in UI and keep setup available for Q&A.

**Answer:** Preconfigure. Registration and policy are set before the demo; the
UI displays current identity and policy so judges see the state is real. Setup
remains runnable live if judges ask. Keeps two transactions off the critical
path of a timed pitch.

### Q4 — Primary explorer

MonadVision or Monadscan?

**Recommended:** MonadVision per brief; verify on both if time.

**Answer:** MonadVision is primary and is what UI proof links point at. Verify
the contract on Monadscan as well if time permits.

### Q5 — Cloudflare ownership

Which account/team owns Pages? `pages.dev` or custom domain?

**Recommended:** team account + `pages.dev`; custom domain after stability.

**Answer:** The existing Cloudflare account already bound on the build box
(`~/.cloudflare/env`, Pages Write), deploying to `*.pages.dev`. No custom domain
for the MVP — revisit only once the demo is stable. Keeps DNS and certificates
off the critical path.

### Q6 — Git workflow

Lane branches/PRs, or direct `main` during hackathon?

**Recommended:** branches + preview deployments; only Tejas authorizes emergency
direct-main fix.

**Answer:** Lane branches merged to `main` via PR, with Cloudflare Pages preview
deployments per branch. Retained even though only one agent is now active —
the value is per-lane preview builds and clean rollback points, not review.
Only Tejas authorizes a direct-to-main emergency fix.

## Important

### Q7 — Downstream action

Is attestation-only `TRANSFER_MOCK` enough, or add mock executor/treasury?

**Recommended:** attestation-only unless judging requires asset movement.

**Answer (defaulted to recommendation — not explicitly confirmed):**
Attestation-only. No mock executor or treasury in the MVP. A successful
attestation proves policy evaluation, not completion of a downstream action, and
the UI must say so.

### Q8 — Amount units

Does `10` mean 10 MON, 10 wei, or abstract policy units?

**Recommended:** define raw units and UI conversion. If no MON moves, label
policy units or document 18-decimal semantics to avoid misleading judges.

**Answer:** Abstract policy units. Amounts are plain integers representing
policy budget, and the UI labels them "policy units" explicitly. No MON figures
are displayed and no decimal conversion exists anywhere, so no judge can
conclude that value moved.

### Q9 — Replay

May the same `resultHash` be attested twice?

**Recommended:** reject duplicates if it identifies a unique external action;
otherwise explicitly document nonce-based uniqueness.

**Answer:** Reject duplicates. The contract tracks used `resultHash` values and
reverts on replay, making each attestation a provably unique external action.
Requires a dedicated revert name for the UI to render.

### Q10 — Confirmation

Success at first receipt, finalized block, or verified state-root stage?

**Recommended:** show included at receipt, then confirmed at the normal
non-financial attestation threshold.

**Answer (defaulted to recommendation — not explicitly confirmed):** Show
"included" at first receipt, then "confirmed" at the normal non-financial
threshold. Two distinct UI states, never collapsed into one.

### Q11 — Demo control

One laptop/profile operator or split across laptops?

**Recommended:** one demo laptop with two isolated profiles; second laptop holds
explorer/backup.

**Answer (defaulted to recommendation — not explicitly confirmed):** One demo
laptop with two isolated browser profiles (principal and agent); a second device
holds the explorer and the backup recording.

### Q12 — Visual identity

Keep current dark purple UI or use official event brand?

**Recommended:** keep structure; adopt official assets only when provided with
usage rights.

**Answer (defaulted to recommendation — not explicitly confirmed):** Keep the
current structure and dark purple treatment. Adopt official event assets only if
provided with explicit usage rights.

### Q13 — Off-chain datastore

Does the MVP add an off-chain database (Supabase/Postgres)?

Note: "MonadDb" is not an option — it is the Monad node client's internal state
storage engine, not an application database. The real choice is on-chain
contract state versus an off-chain datastore.

**Recommended:** no. `ARCHITECTURE.md` states no Worker/backend is required for
the MVP, and contract storage plus `executeGated` events already serve as the
persistence and audit layer. A Supabase service key cannot ship in a static
Pages SPA, so any non-trivial use forces a Worker — a new approved architecture
lane and a new secret-handling surface. Authoritative policy or identity data in
a centralized database also undercuts the judge-facing claim of verifiable
on-chain gating.

If adopted later, scope it to the existing **Later** item (post-hackathon event
indexer / audit API): strictly derived, read-only data rebuildable from chain
logs, with the contract remaining source of truth.

**Answer:** No. Tejas confirmed 2026-07-25: the MVP ships with no off-chain
datastore. Contract storage and `executeGated` events are the persistence and
audit layer. Supabase is deferred to the post-hackathon indexer item under
**Later**, and only as strictly derived read-only data. Any agent proposing an
off-chain datastore must reopen this question and get an architecture lane
first.

## Later

- Public simulation toggle or hidden query flag?
- Post-hackathon event indexer?
- Cloudflare Worker audit API?
- Multiple actions and rolling spend windows?
- Long-term contract/Cloudflare owner?
