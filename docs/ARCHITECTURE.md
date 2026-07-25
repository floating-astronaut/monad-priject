# MONAD | Gate — Architecture Contract

## Components

### React demo surface (`ui/`)

Owns wallet connection, workflow presentation, local fail/pass simulation, and
the live `executeGated` transaction. The UI imports the frozen ABI from
`packages/abi/gate.json`.

### Interface handoff (`packages/abi/`)

`gate.json` is the only contract surface consumed by the UI.
`addresses.json` records chain ID, RPC, explorer, deployed address, and the
canonical `TRANSFER_MOCK` action ID.

### Monad contract (`contracts/`)

`MonadGate.sol` stores agent identity and one current policy per agent. The
principal signs registration and policy changes. The registered agent signs
`executeGated`.

## Frozen interface

```solidity
registerAgent(address agent, address principal, string label)
setPolicy(address agent, uint256 maxSpend, bytes32 allowedActionId, bool active)
executeGated(bytes32 actionId, uint256 amount, bytes32 resultHash)
```

No new Solidity surface is added without an operator decision and a matching
update to this document.

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
A valid request sends `executeGated`; the confirmed transaction links to
MonadVision.

## Deployment target

- Chain: Monad Testnet
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadvision.com`

