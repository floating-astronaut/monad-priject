# Operator Open Questions

Owner: Tejas  
Status: answer blocking items before implementation

Write answers under each item. Defaults are recommendations, not hidden
decisions.

## Blocking

### Q1 — Identity lifecycle

Immutable registration, or current-principal rotation/revoke?

**Recommended:** current principal may rotate/deactivate; unrelated caller can
never overwrite.

**Answer:**

### Q2 — Wallet separation

Will principal and deployer be separate burners?

**Recommended:** separate if funded; otherwise one deployer/principal burner and
one distinct agent burner.

**Answer:**

### Q3 — Live setup

Should judges watch registration/policy transactions?

**Recommended:** preconfigure; show state in UI and keep setup available for Q&A.

**Answer:**

### Q4 — Primary explorer

MonadVision or Monadscan?

**Recommended:** MonadVision per brief; verify on both if time.

**Answer:**

### Q5 — Cloudflare ownership

Which account/team owns Pages? `pages.dev` or custom domain?

**Recommended:** team account + `pages.dev`; custom domain after stability.

**Answer:**

### Q6 — Git workflow

Lane branches/PRs, or direct `main` during hackathon?

**Recommended:** branches + preview deployments; only Tejas authorizes emergency
direct-main fix.

**Answer:**

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

## Important

### Q7 — Downstream action

Is attestation-only `TRANSFER_MOCK` enough, or add mock executor/treasury?

**Recommended:** attestation-only unless judging requires asset movement.

**Answer:**

### Q8 — Amount units

Does `10` mean 10 MON, 10 wei, or abstract policy units?

**Recommended:** define raw units and UI conversion. If no MON moves, label
policy units or document 18-decimal semantics to avoid misleading judges.

**Answer:**

### Q9 — Replay

May the same `resultHash` be attested twice?

**Recommended:** reject duplicates if it identifies a unique external action;
otherwise explicitly document nonce-based uniqueness.

**Answer:**

### Q10 — Confirmation

Success at first receipt, finalized block, or verified state-root stage?

**Recommended:** show included at receipt, then confirmed at the normal
non-financial attestation threshold.

**Answer:**

### Q11 — Demo control

One laptop/profile operator or split across laptops?

**Recommended:** one demo laptop with two isolated profiles; second laptop holds
explorer/backup.

**Answer:**

### Q12 — Visual identity

Keep current dark purple UI or use official event brand?

**Recommended:** keep structure; adopt official assets only when provided with
usage rights.

**Answer:**

## Later

- Public simulation toggle or hidden query flag?
- Post-hackathon event indexer?
- Cloudflare Worker audit API?
- Multiple actions and rolling spend windows?
- Long-term contract/Cloudflare owner?

