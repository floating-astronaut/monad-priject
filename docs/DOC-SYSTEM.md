# Doc System

> The master map. This file tells every agent which docs exist, what each one
> governs, and which wins when they disagree. Read it first.

A repo running the Method has a small, ordered set of docs. The point isn't
"more documentation" — it's a **known set of contracts** with explicit
precedence, so an agent never guesses where the truth lives.

## Precedence (highest wins)

1. **Direct operator instruction** (this session's chat)
2. **This file** (`DOC-SYSTEM.md`) — the map
3. **Spoke docs** — the architecture / product / contract docs named below
4. **Live control-plane** — `control-plane/ACTIVE_LANE_BOARD.md`, `SESSION_COORDINATION.md`
5. **Historical evidence** — `control-plane/ENGINEERING_SUPERVISOR.md`
6. **Generated/meta** — `docs/_meta/*` (retrieval aids, not law)
7. **Codebase**
8. **Prior chat claims**

## The doc set

| Doc | Governs | Updated when |
|---|---|---|
| `docs/THE-METHOD.md` | the core loop | the workflow itself changes |
| `docs/AGENT-SYNC-PROTOCOL.md` | the multi-agent contract | coordination rules change |
| `docs/ROLES.md` | agent division of labor | the roster or split changes |
| `docs/LANE-LIFECYCLE.md` | how lanes move | the lane process changes |
| `docs/DOC-SYSTEM.md` | this map + precedence | a doc is added/retired or precedence shifts |
| `control-plane/ACTIVE_LANE_BOARD.md` | the live work queue | every lane state change |
| `control-plane/SESSION_COORDINATION.md` | who's active now | sessions start/stop |
| `control-plane/ENGINEERING_SUPERVISOR.md` | evidence log | every lane close |
| `docs/PRODUCT.md` | product scope, demo contract, and acceptance criteria | user-facing behavior or scope changes |
| `docs/ARCHITECTURE.md` | system boundaries, contract interface, and runtime modes | component, interface, chain, or deployment changes |
| `docs/BUILD-SPEC.md` | implementation requirements and demo-ready definition | build scope or delivery contract changes |
| `docs/IMPLEMENTATION-LANES.md` | ordered backlog, ownership, dependencies, kill switches | lane graph or role ownership changes |
| `docs/LOCAL-DEVELOPMENT.md` | clean-machine setup and local run commands | local tooling or commands change |
| `docs/MONAD-DEPLOYMENT.md` | testnet deploy, verify, record, and handoff | chain tooling/network/deploy process changes |
| `docs/CLOUDFLARE-DEPLOYMENT.md` | Pages preview, production, fallback, rollback | hosting configuration/process changes |
| `docs/TESTING.md` | required tests, release gates, evidence | behavior or verification requirements change |
| `docs/SECURITY.md` | threat model, secret handling, demo truth | trust boundary or credential handling changes |
| `docs/DEMO-OPERATIONS.md` | pitch, preflight, fallback, and Q&A | judge-facing flow changes |
| `docs/SOURCES.md` | primary research index and retrieval rules | a mutable fact/source is added or replaced |
| `docs/OPEN-QUESTIONS.md` | decisions reserved for Tejas | an answer is given or new blocker found |
| `docs/DEMO.md` | legacy short pitch card | keep aligned with `DEMO-OPERATIONS.md` until retired |

## Reading routes

- Any coding lane: `BUILD-SPEC.md`, `ARCHITECTURE.md`, `SECURITY.md`, then the
  lane-specific runbook.
- Backend/chain: add `MONAD-DEPLOYMENT.md` and `TESTING.md`.
- Frontend/deployment: add `CLOUDFLARE-DEPLOYMENT.md`, `TESTING.md`, and
  `DEMO-OPERATIONS.md`.
- Tejas/orchestration: `OPEN-QUESTIONS.md`, `IMPLEMENTATION-LANES.md`, live
  control plane.
- Any mutable external fact: verify against `SOURCES.md`.

## Rules

- **Amend, don't fork.** If a fact belongs in an existing doc, update it there.
  Don't spawn a second source of truth for the same contract.
- **Register new docs here.** A contract doc that isn't in this map is invisible
  to the next agent. Add it the moment it's created.
- **Meta is an aid.** Anything under `docs/_meta/*` (generated indexes,
  embeddings, retrieval helpers) supports lookup but never overrides an owning
  doc.
- **The map is itself a contract.** Changing precedence or the doc set is a
  lane like any other — write it back here.
