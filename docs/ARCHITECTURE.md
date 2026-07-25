# MONAD | Gate — Architecture Contract

## Components

### React application (`ui/`)

Owns principal setup, agent action, wallet/chain state, transaction lifecycle,
local fail/pass simulation, and explorer proof. The UI imports the frozen ABI
from `packages/abi/gate.json`.

### Interface handoff (`packages/abi/`)

`gate.json` is the only contract surface consumed by the UI. It is **generated
from the compiler artifact** (BE-3, 2026-07-26) and must never be hand-edited.
It now carries the full ABI — 9 functions, 5 events, 9 custom errors — so the UI
can decode a revert reason instead of showing a raw selector. The previous
hand-written 4-function file was a strict subset, so nothing that worked before
broke.
`addresses.json` records chain ID, RPC, explorer, deployed address, the
canonical `TRANSFER_MOCK` action ID, and the public burner addresses for the
deployer/principal and the agent. It holds public values only — never a key.

### Monad contract (`contracts/`)

`MonadGate.sol` stores agent identity and one current policy per agent. The
principal signs registration and policy changes. The registered agent signs
`executeGated`.

Identity overwrite/rotation semantics were hardened in BE-1 (2026-07-26); see
the frozen interface below.

**Identity lifecycle (OP-1 Q1, decided 2026-07-25; implemented BE-1).**
Registration binds an agent to a principal. Only the current principal may
rotate that binding, change policy, or deactivate. An unrelated caller may never
overwrite an existing registration. No agent-side kill switch in the MVP.

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
transferPrincipal(address agent, address newPrincipal)
rotateAgent(address oldAgent, address newAgent)
executeGated(bytes32 actionId, uint256 amount, bytes32 resultHash)
```

No new Solidity surface is added without an operator decision and a matching
update to this document.

### BE-1 — implemented 2026-07-26

`transferPrincipal` and `rotateAgent` are new surface added under OP-1 Q1 and
are now part of the frozen interface. Both are additive: no existing signature,
parameter list, or event changed, so a client built against the pre-BE-1 ABI
still works.

**Authorization now enforced**

- `registerAgent` reverts `AgentAlreadyRegistered` on an already-registered
  agent. This is the fix for the DOC-1 finding — previously any caller could
  name itself principal and seize a live agent, then raise its cap.
- `registerAgent` reverts `PrincipalIsAgent` when agent equals principal
  (OP-1 Q2), so the authority boundary is enforced rather than assumed.
- `transferPrincipal` and `rotateAgent` authenticate the current principal.
- `rotateAgent` carries the policy to the new address and clears both the
  identity and the policy on the old one, so a retired address cannot keep an
  active cap.
- `executeGated` reverts `ResultAlreadyAttested` on a repeated result hash
  (OP-1 Q9), checked after every policy check so a denied action never consumes
  a hash.

**New errors:** `AgentAlreadyRegistered(address)`, `PrincipalIsAgent()`,
`ResultAlreadyAttested(address,bytes32)`. The UI must render all three.

**Known limitation — rotation resets replay protection.** `attestedResult` is
keyed `(agent, resultHash)`. A rotated identity therefore starts with an empty
replay set, and a hash already attested by the retired address can be attested
again by the new one. This is covered by a passing test
(`testRotationResetsReplayProtection`) so the behaviour is recorded, not
latent. Global keying would close it at the cost of letting any agent burn
another agent's result hash. Operator decision if it matters for the demo;
one-line change either way.

**Deactivation** uses `setPolicy(agent, …, active=false)`. No separate
function — it already enforces principal-only and halts every action.

**Deferred to BE-1b:** `ActionAttested` still omits the nonce that
`SECURITY.md` requires it to bind, so `attestationId` cannot be recomputed
off-chain from the event alone. Deferred deliberately: it is the only breaking
ABI change in the proposal and must land paired with the UI update.

**Not implemented:** agent-side kill switch (Q1 excluded it), upgradeability or
admin role (`SECURITY.md` forbids a backdoor without explicit approval), any
change to `executeGated`'s parameter list.

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
