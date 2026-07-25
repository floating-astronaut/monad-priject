# Session Coordination

> Who is active right now, and on what. Claim before you touch. See docs/AGENT-SYNC-PROTOCOL.md §4.

| Agent | Started | Lane | Surface | Status |
|-------|---------|------|---------|--------|
| Claude | 2026-07-25 | OP-1 write-back | docs, control-plane | done |
| Claude | 2026-07-25 | BE-1 | `contracts/`, `docs/ARCHITECTURE.md` | claimed |
| Tejas | 2026-07-25 | ENV-1 | burner wallets, funding | closed 2026-07-26 |
| Claude | 2026-07-26 | ENV-1 | keystores, `packages/abi/addresses.json`, docs, funding tx | done |
| Claude | 2026-07-26 | tooling | `tools/sheet_sync.py`, operator sheet | done |
| Claude | 2026-07-26 | BE-3 | `contracts/`, `packages/abi/`, deploy | done |
| Claude | 2026-07-26 | DEP-1 | `ui/`, Cloudflare Pages | in progress |

Codex: withdrawn 2026-07-25, no longer claims surfaces.

Note: agents share the checkout at `~/monad-gate-blitz`. On 2026-07-25 a Codex
commit and an uncommitted Claude edit overlapped in this working tree without
either being registered here. Nothing was lost, but only by timing. Any future
second agent works from its own clone or git worktree.
