# MONAD | Gate — Build Specification

Status: implementation source of truth  
Last researched: 2026-07-25  
Operator: Tejas

## Delivery objective

Ship a reliable Monad Testnet demonstration in which:

1. a principal registers an agent;
2. the principal activates a policy for one action and a maximum amount;
3. the agent attempts an over-cap action and Monad rejects it;
4. the agent retries inside policy and Monad emits an attestation;
5. the UI links to the real testnet transaction and verified contract.

The primary judged path is real wallet → real contract → real Monad explorer
proof. A fully labeled simulation remains only as a resilience fallback.

## Monad is the default, not an option

This is a Monad hackathon. Every authoritative artifact reinforces that:

- deployment target: Monad Testnet only;
- wallet network: Monad Testnet only;
- explorer proof: MonadVision or Monadscan testnet;
- receipt: a Monad transaction/event;
- UI: no chain selector or multi-chain abstraction;
- pitch: bounded agent authority proven natively on Monad.

Monad documents full EVM bytecode and Ethereum JSON-RPC compatibility. Its
current developer summary describes 300 ms blocks and 600 ms finality. Parallel
execution remains an implementation detail for normal contracts, so we use
standard Solidity semantics and Monad for the actual proof.

Sources:

- [Monad introduction](https://docs.monad.xyz/)
- [Deployment summary](https://docs.monad.xyz/developer-essentials/summary)
- [Monad Testnet information](https://docs.monad.xyz/developer-essentials/testnets)

## Required system

```text
Principal wallet ── register/set policy ──▶ MonadGate on Monad Testnet
                                                 ▲
Agent wallet ─── executeGated(action, amount) ───┘
                                                 │
                                                 └── ActionAttested event

Cloudflare Pages ── serves React UI ── wallet/RPC/receipt ──▶ Monad
```

No application backend is required for the MVP. The browser talks to the wallet
and public RPC. Add a Cloudflare Worker only if Tejas approves a feature that
requires a secret, server-side API, rate limiting, or durable off-chain storage.

## Wallet roles

Use separate funded burner accounts:

| Account | Signs | Must never do |
|---|---|---|
| Principal | registration, policy activation/pause | expose key to browser code |
| Agent | gated action | control its own policy |
| Deployer | deployment only | double as personal treasury |

Principal and deployer may be the same burner if Tejas chooses speed. Agent must
remain distinct so the authorization story is real.

## Contract requirements before deployment

The current proof-of-concept is not deployment-ready until Claude:

1. prevents an arbitrary new principal from overwriting an already registered
   agent;
2. implements an approved rotation/revoke rule or freezes identity;
3. tests zero addresses, unauthorized mutation, inactive policy, wrong action,
   cap boundaries, success events, and replay semantics;
4. confirms whether duplicate `resultHash` values are allowed;
5. exports the ABI mechanically from the compiler artifact;
6. uses Monad Foundry with reproducible compiler settings.

The contract does not transfer funds. `amount` is policy input and the event is
proof the requested action was allowed. UI and pitch must not claim payment.

## Frontend requirements

Codex implements three explicit modes:

- **Setup:** principal connects, registers agent, sets/pauses policy.
- **Agent action:** agent connects, attempts `TRANSFER_MOCK`, sees denial or
  confirmed attestation.
- **Simulation:** no wallet/contract required; all artifacts visibly simulated.

Transaction states:

`idle → wallet prompt → submitted → included → confirmed/failed`

Guardrails:

- validate chain ID `10143`;
- show connected role/address;
- use distinct principal and agent signers in the live demo;
- decode known contract errors and preserve raw details;
- disable double submissions;
- link only real hashes to the explorer;
- show configured contract and verification link;
- provide a resettable scripted demo state.

## Configuration contract

Public client configuration:

```text
VITE_CHAIN_ID=10143
VITE_RPC_URL=<deploy-day verified public RPC>
VITE_GATE_ADDRESS=0x...
VITE_EXPLORER_BASE=https://testnet.monadvision.com
VITE_ACTION_ID_TRANSFER_MOCK=0x...
```

All `VITE_*` values are public because Vite bundles them into client code.
Private keys and privileged API tokens must never use this prefix.

Source: [Vite environment variables](https://vite.dev/guide/env-and-mode).

## Demo-ready definition

- Contract unit/fuzz suite passes.
- Monad Foundry dry-run succeeds.
- Contract is deployed and source-verified on current testnet.
- ABI/address handoff matches deployed bytecode.
- Principal setup and agent deny/pass work from clean browser sessions.
- Cloudflare URL loads on venue Wi-Fi and hotspot.
- Explorer transaction and contract pages are bookmarked.
- Simulation works offline.
- Backup recording exists on two devices.
- No secret appears in Git, bundle, logs, or screenshots.

