# Testing and Verification Contract

## Contract tests — Claude

Required unit cases:

- registration success/event and zero-address rejection;
- unrelated caller cannot overwrite identity;
- only stored principal mutates policy;
- inactive policy, wrong action, and over-cap reject;
- amount at cap passes and one above rejects;
- successful event fields match;
- attestation IDs/replay behavior match approved semantics;
- rotation/unregister behavior if approved.

Fuzz/invariants:

- any `amount > maxSpend` cannot attest;
- unregistered sender cannot attest;
- non-principal cannot mutate another agent's policy;
- nonce only increases on success;
- action mismatch never attests.

## Frontend tests — Codex

- role/address labeling and chain mismatch;
- custom-error decoding;
- public configuration validation;
- simulation/live separation;
- transaction state progression;
- explorer URL construction;
- double-submit prevention and reset.

## Integration

- Anvil principal setup and agent action;
- testnet read/write;
- ABI/address mismatch fails loudly;
- account/chain changes refresh state;
- RPC failure preserves recovery instructions.

## Browser/E2E — Codex

Against Cloudflare preview and production:

1. load without errors;
2. connect principal;
3. register/set policy;
4. switch to agent;
5. deny 100;
6. allow 5;
7. open explorer;
8. refresh and restore on-chain state;
9. test simulation fallback.

## Release evidence

| Gate | Evidence |
|---|---|
| Backend | command, test count, commit, Monad Foundry version |
| Deploy | address, tx, chain ID, verified source |
| Frontend | build/typecheck, screenshots, console result |
| Integration | public addresses and both observed outcomes |
| Cloudflare | URL, SHA, desktop/mobile smoke |
| Demo | timed rehearsal and offline video |

No "should work" claims.

Monad notes receipts appear after proposal and distinguishes included/finalized/
verified stages. For this non-financial attestation, the UI may show receipt
inclusion then confirmed status; it must not imply payment settlement.

Source: [Monad timing](https://docs.monad.xyz/developer-essentials/summary).

