# MONAD | Gate — Architecture Contract

## Components

### React application (`ui/`)

Owns principal setup, agent action, wallet/chain state, transaction lifecycle,
local fail/pass simulation, and explorer proof. The UI imports the frozen ABI
from `packages/abi/gate.json`.

### Interface handoff (`packages/abi/`)

`gate.json` is the only contract surface consumed by the UI.
`addresses.json` records chain ID, RPC, explorer, deployed address, and the
canonical `TRANSFER_MOCK` action ID.

### Monad contract (`contracts/`)

`MonadGate.sol` stores agent identity and one current policy per agent. The
principal signs registration and policy changes. The registered agent signs
`executeGated`.

Before deployment, identity overwrite/rotation semantics must be hardened per
`BUILD-SPEC.md` and `SECURITY.md`.

**Identity lifecycle (OP-1 Q1, decided 2026-07-25).** Registration binds an
agent to a principal. Only the current principal may rotate that binding, change
policy, or deactivate. An unrelated caller may never overwrite an existing
registration. No agent-side kill switch in the MVP. The concrete function
surface implementing this is BE-1 design work and must be added to the frozen
interface below, with operator sign-off, before implementation.

**Replay (OP-1 Q9).** `executeGated` rejects a `resultHash` that has already
been attested, with a dedicated revert name the UI renders.

**Units (OP-1 Q8).** `maxSpend` and `amount` are abstract policy units — plain
integers, no decimals, no MON conversion. The UI labels them "policy units". No
MON-denominated figure is displayed anywhere.

### Cloudflare Pages

Serves the built static SPA from `ui/dist` using Git integration. It holds only
public build configuration. No Worker/backend is required for the MVP.

### No off-chain datastore

The MVP uses no external database. Contract storage holds identity and policy;
`executeGated` events are the audit trail. Adding an off-chain datastore
(Supabase or otherwise) requires reopening `OPEN-QUESTIONS.md` Q13 and an
approved architecture lane — a service key cannot ship in the static SPA, so it
implies a Worker. Any future indexer is strictly derived, read-only, and
rebuildable from chain logs; the contract stays source of truth.

## Frozen interface

```solidity
registerAgent(address agent, address principal, string label)
setPolicy(address agent, uint256 maxSpend, bytes32 allowedActionId, bool active)
executeGated(bytes32 actionId, uint256 amount, bytes32 resultHash)
```

No new Solidity surface is added without an operator decision and a matching
update to this document.

**Pending addition (BE-1).** OP-1 Q1 authorized principal-controlled rotation
and deactivation; the function signatures that implement it are not yet chosen
and are therefore not yet frozen. BE-1 proposes them here for operator sign-off
before writing the implementation. Until that happens, the three signatures
above remain the whole surface.

## Trust boundary

- Identity is keyed by the agent address.
- The principal can create or replace that identity and policy only by signing.
- `executeGated` evaluates `msg.sender`; a third party cannot attest as the
  registered agent.
- A successful attestation proves policy evaluation, not completion of a
  downstream payment or tool action.
- No secret or private key is accepted by the browser app or tracked in Git.

## Runtime modes

**Demo mode** is the default when `VITE_GATE_ADDRESS` is empty. It exercises the
same product state machine locally and labels receipts as simulated.

**Live mode** requires `VITE_GATE_ADDRESS` and a connected Monad testnet wallet.
Principal mode registers/sets policy; agent mode sends `executeGated`. Confirmed
transactions link to the configured testnet explorer.

## Deployment target

- Chain: Monad Testnet
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadvision.com`

These are expected baselines, not permanent facts. Re-check
`docs/MONAD-DEPLOYMENT.md` and official sources on deploy day; the current
testnet has previously reset.

## Deployment boundary

- Monad contract and explorer verification: Claude.
- Cloudflare Pages and frontend public config: Claude (was Codex; roster changed
  2026-07-25 — see `ROLES.md`). Existing box Cloudflare account, `*.pages.dev`,
  no custom domain for the MVP (OP-1 Q5).
- Credentials, funding, and production go/no-go: Tejas.
- A Cloudflare Worker requires a new approved architecture lane.
- Lane branches merged to `main` by PR, preview deploy per branch (OP-1 Q6).
