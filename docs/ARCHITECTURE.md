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
and are therefore not yet frozen. BE-1 proposes them below for operator sign-off
before writing the implementation. Until Tejas signs off, the three signatures
above remain the whole surface.

### BE-1 proposed interface — AWAITING SIGN-OFF

Status: proposed 2026-07-26 by Claude. Not implemented. Not frozen.

**P0 — `registerAgent` overwrite guard (no signature change)**

```solidity
error AgentAlreadyRegistered(address agent);
```

`registerAgent` reverts if `agents[agent].registered` is already true. This is
the actual fix for the DOC-1 finding: today the function only checks
`msg.sender == principal`, which any caller satisfies by naming themselves, so
any address can seize a registered agent and then re-policy it.

**P0 — replay rejection (OP-1 Q9)**

```solidity
mapping(address => mapping(bytes32 => bool)) public attestedResult;
error ResultAlreadyAttested(address agent, bytes32 resultHash);
```

Keyed on `(agent, resultHash)`, **not** `resultHash` alone. Global keying would
let any registered agent burn a `resultHash` another agent intends to use — a
griefing vector that costs the attacker one transaction. Per-agent keying still
prevents an agent replaying its own attestation, which is what Q9 asks for.
Flagging the tradeoff because global keying is the more obvious reading of Q9
and is the stronger claim if you would rather have it.

**P1 — rotation (OP-1 Q1)**

```solidity
function transferPrincipal(address agent, address newPrincipal) external;
function rotateAgent(address oldAgent, address newAgent) external;

event PrincipalTransferred(address indexed agent, address indexed oldPrincipal, address indexed newPrincipal);
event AgentRotated(address indexed oldAgent, address indexed newAgent, address indexed principal);
```

Both callable only by the current principal. `rotateAgent` moves identity **and
policy** to `newAgent` and clears `oldAgent` — see the stale-policy note below.

**Deactivation needs no new function.** `setPolicy(agent, …, active=false)`
already enforces principal-only and already halts every action. Adding a
separate `deactivateAgent` would be a second way to express one state. Q1's
"deactivate" is satisfied by the existing surface; documenting that instead of
growing the ABI.

**P1 — stale policy on rotation (latent bug)**

`registerAgent` overwrites `agents[agent]` but never touches `policies[agent]`.
Any path that rebinds an agent therefore inherits the previous policy, including
an active one with a high cap. `rotateAgent` must move the policy deliberately
and clear the old slot; re-registration of a cleared agent must start from no
policy.

**P2 — nonce not in the event (SECURITY.md violation)**

`docs/SECURITY.md` requires the attestation event to bind "agent, principal,
action, amount, result, nonce". `ActionAttested` omits the nonce, so
`attestationId` cannot be recomputed off-chain from the event alone — the
verification story we tell judges does not currently hold. Fix:

```solidity
event ActionAttested(
    bytes32 indexed attestationId,
    address indexed agent,
    address indexed principal,
    bytes32 actionId,
    uint256 amount,
    bytes32 resultHash,
    uint256 nonce            // added
);
```

This changes the event ABI the UI decodes. Also proposing the counter move from
one global `attestationNonce` to per-agent, so one agent's activity does not
perturb another's attestation IDs.

**P2 — enforce `agent != principal`**

```solidity
error PrincipalIsAgent();
```

OP-1 Q2 decided principal must never equal agent. Today that is convention only.
The authority boundary is the entire product claim, so enforcing it on-chain
costs one comparison and removes the chance of a misconfigured demo silently
proving nothing.

**Not proposed:** agent-side kill switch (Q1 excluded it), upgradeability or
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
