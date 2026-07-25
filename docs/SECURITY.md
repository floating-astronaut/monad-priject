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

- unrelated principal cannot claim existing agent;
- only stored principal mutates policy;
- execution authenticates `msg.sender`;
- deny paths cannot emit attestation;
- event binds agent, principal, action, amount, result, nonce;
- rotation/replay semantics are explicit and tested;
- no upgrade/admin backdoor unless Tejas approves it.

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

