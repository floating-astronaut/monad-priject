# MONAD | Gate

Permission and proof for autonomous agents on Monad.

MONAD | Gate binds an agent wallet to a human principal, lets that principal set a narrow action policy, blocks actions outside the policy, and emits an on-chain attestation for allowed actions.

## The 90-second demo

1. **Identity** — Atlas is registered to a human principal who remains liable.
2. **Deny** — Run the preloaded `100 MON` action against a `10 MON` cap.
3. **Allow** — Click **Set amount to 5 MON**, then run it again.
4. **Prove** — In live mode, open the transaction receipt on MonadVision.

The UI starts in safe demo mode, so this complete fail-to-pass story works without a wallet, RPC, or deployed contract.

## Repository

```text
monad-gate-blitz/
├── contracts/
│   ├── src/MonadGate.sol       # Register, Policy, Gate, Attest
│   ├── test/MonadGate.t.sol    # deny, allow, authorization tests
│   └── script/Deploy.s.sol
├── packages/abi/
│   ├── gate.json               # frozen UI/contract interface
│   └── addresses.json          # Monad testnet handoff
├── ui/                         # React + TypeScript + ethers
└── docs/DEMO.md                # pitch and operator runbook
```

## Run the UI

Requirements: Node 20+ and npm.

```bash
cd ui
npm install
npm run dev
```

Open `http://localhost:5173`.

For a production check:

```bash
npm run build
```

## Connect the live contract

Copy the environment template and add the deployed contract address:

```bash
cd ui
cp .env.example .env
```

```dotenv
VITE_GATE_ADDRESS=0x...
VITE_EXPLORER_BASE=https://testnet.monadvision.com
VITE_RPC_URL=https://testnet-rpc.monad.xyz
```

Restart the UI. A connected wallet will then send valid `executeGated` calls to Monad testnet. Registration and policy setup are intentionally principal-signed contract operations; the demo UI presents their current state and focuses the live interaction on the judge-facing fail/pass story.

## Contract

Requirements: Foundry.

```bash
cd contracts
forge test -vv
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast
```

Use a funded burner key through Foundry's secure wallet/keystore flow. Never commit a private key or `.env`.

## Contract boundary

```solidity
registerAgent(agent, principal, label)
setPolicy(agent, maxSpend, allowedActionId, active)
executeGated(actionId, amount, resultHash)
```

`executeGated` can only be called by the registered agent. It reverts unless the policy is active, the action ID matches, and the amount is at or below the cap. A successful call emits `ActionAttested`, tying together the agent, principal, action, amount, and off-chain result hash.

## Scope

This hackathon build deliberately excludes multi-chain support, payments custody, full compliance workflows, agent swarms, and a marketing site. It is the smallest credible permission-and-proof layer for the Monad agent economy.

