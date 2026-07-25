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
- event binds agent, principal, action, amount, result, nonce — **enforced**
  (BE-1b, 2026-07-26). `ActionAttested` now carries the nonce, and
  `attestationId` is recomputable off chain from the log alone. Proven twice:
  by `testAttestationIdIsRecomputableFromEventAlone`, and against the live
  deployment by recomputing
  `0x2a3d83dc…c113` from the emitted event's topics and data.

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
| Google service-account key | Yes | build box only, outside the repo tree |
| Operator sheet ID | Kept out of Git | `MONAD_SHEET_ID` / `~/.monad-gate/sheet.env` |

One GitHub mirror of this repo is **public**
(`github.com/floating-astronaut/monad-project`). Treat every tracked file as
world-readable: no IDs, endpoints, or internal URLs that are not meant to be.

## Burner wallets (ENV-1, 2026-07-26)

Testnet burners only, generated on the build box with `cast wallet new` into
encrypted JSON keystores. The keys were never pasted into a prompt, a commit, or
any chat transcript.

**Operator decision, 2026-07-26.** Tejas directed that every wallet and secret
this project generates also be mirrored into the private operator sheet, in the
clear, for hackathon speed. That is now the standing rule and it changes this
contract:

- the authoritative copies stay on the box (`~/.foundry/keystores`,
  `~/.monad-gate/secrets.json`, mode 0600);
- `tools/sheet_sync.py` publishes them to the `Secrets` tab of the sheet, which
  is shared with exactly two identities (Tejas and one service account) and is
  **not** link-shared;
- this is acceptable only because both wallets are throwaway testnet burners
  holding nothing of value. **Never put a mainnet key, a funded wallet, a
  Cloudflare token, or any credential with real blast radius on that tab.**
  Anything of that class stays on the box and is referenced by path only.

| Role | Address | Foundry account | Password file |
|---|---|---|---|
| deployer + principal | `0xae06174FFd44850FAC43cf8F7D0ECB0848678071` | `monad-deployer` | `~/.monad-gate/deployer.pass` |
| agent | `0xd00e55Da854b53F02Ff0fe8DD6a35f68a14E2030` | `monad-agent` | `~/.monad-gate/agent.pass` |

- Keystores: `~/.foundry/keystores/` (0600), outside the repo tree.
- Password files: `~/.monad-gate/` (dir 0700, files 0400), outside the repo tree.
- Both decrypt-verified via `cast wallet address --account <name> --password-file <file>`.
- Principal never equals agent, per OP-1 Q2 and the `PrincipalIsAgent` control.
- Public addresses only in `packages/abi/addresses.json`. Losing a password file
  means regenerating the pair and re-recording the addresses; there is no backup
  by design, and nothing of value is held.

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

