# Security and Secrets Contract

## Threats

- identity overwrite;
- unauthorized policy mutation;
- wrong wallet/chain;
- key leakage;
- simulated proof presented as live;
- ABI/address drift;
- replay ambiguity;
- RPC/explorer failure;
- frontend supply-chain/deployment compromise.

## Contract controls

Status as of BE-1 (2026-07-26), verified by `forge test` — 14 passed, 0 failed.

- unrelated principal cannot claim existing agent — **enforced**
  (`AgentAlreadyRegistered`), regression-tested;
- principal and agent may not be the same address — **enforced**
  (`PrincipalIsAgent`), per OP-1 Q2;
- only stored principal mutates policy, rotates, or transfers authority —
  **enforced**, tested for `setPolicy`, `transferPrincipal`, `rotateAgent`;
- rotation carries policy and clears the retired slot — **enforced**, so a
  retired address keeps no active cap;
- execution authenticates `msg.sender` — **enforced** (pre-existing);
- deny paths cannot emit attestation — **enforced**; the replay check runs after
  every policy check so a denied action never consumes a result hash;
- replay: a result hash cannot be attested twice by the same agent —
  **enforced** (`ResultAlreadyAttested`), per OP-1 Q9;
- no upgrade/admin backdoor unless Tejas approves it — **none exists**;
- event binds agent, principal, action, amount, result, nonce — **NOT met**.
  `ActionAttested` omits the nonce, so `attestationId` cannot be recomputed
  off-chain from the event alone. Open as lane BE-1b; it is the only breaking
  ABI change and must land with the matching UI update.

**Known limitation.** `attestedResult` is keyed `(agent, resultHash)`, so
`rotateAgent` moves an identity to an address with an empty replay set and a
previously attested hash can be reused. Covered by a passing test
(`testRotationResetsReplayProtection`). Global keying would close it but would
let any agent burn another agent's result hash. Operator decision.

## Secret classification

| Value | Secret? | Location |
|---|---:|---|
| Contract address, action ID, public RPC | No | manifest / `VITE_*` |
| Private key or seed | Yes | encrypted wallet/Foundry keystore |
| Cloudflare token | Yes | Cloudflare/CI secret store |
| Explorer API key | Usually | local/CI secret, never frontend |

Vite warns `VITE_*` values are bundled:
[Vite env guidance](https://vite.dev/guide/env-and-mode).

## Rules

- burner accounts only;
- distinct principal/agent;
- Foundry keystore flags;
- no keys in prompts;
- no `.env`, local env, keystore, or secret in Git;
- inspect staged diff and scan history before submission;
- rotate anything exposed.

## Demo truth

- demo attestation = simulation;
- Monad attestation = real hash;
- verified contract = explorer source verification;
- action allowed ≠ funds transferred.

