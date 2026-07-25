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

