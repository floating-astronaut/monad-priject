# Monad Testnet Deployment Runbook

Owner: Claude, with Tejas approving credential use  
Verifier: Codex  
Target: Monad Testnet only

## Re-verify network facts on deploy day

Testnet is active infrastructure and has previously reset. Read the current
official network page and record chain ID, selected RPC/provider limits,
explorers, faucet, and revision.

Source: [Monad Testnet information](https://docs.monad.xyz/developer-essentials/testnets).

Expected baseline:

```text
Chain ID: 10143
Symbol: MON
Foundation RPC: https://testnet-rpc.monad.xyz
MonadVision: https://testnet.monadvision.com
Monadscan: https://testnet.monadscan.com
Faucet: https://faucet.monad.xyz
```

The official page wins if it differs.

## Install Monad Foundry

```bash
curl -L https://foundry.category.xyz | bash
foundryup --network monad
forge --version
```

Monad says its fork provides Monad-native execution, staking support, and trace
decoding. Source:
[Monad Foundry deployment guide](https://docs.monad.xyz/guides/deploy-smart-contract/foundry).

## Secure keystore

Preferred:

```bash
cast wallet import monad-deployer --interactive
cast wallet address --account monad-deployer
```

Never paste a key into Git, prompts, shell history, screenshots, or frontend.
The official guide recommends keystore accounts over raw private-key flags.

## Fund and probe

```bash
cast chain-id --rpc-url https://testnet-rpc.monad.xyz
cast balance <DEPLOYER_ADDRESS> --rpc-url https://testnet-rpc.monad.xyz
```

Keep enough test MON for deploy, setup, pass attempt, and retries.

## Reproducible configuration

`foundry.toml` pins compiler version, optimizer, paths, chain ID, RPC reference,
and metadata settings required for verification.

Before broadcast:

```bash
forge fmt --check
forge clean
forge build
forge test -vvv
```

## Simulate, then broadcast

Run without `--broadcast` first. Save trace and gas estimate. Then:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer \
  --broadcast
```

Claude reconciles the exact script name before execution.

## Record deployment atomically

Immediately record:

- chain ID, contract and deployer;
- deployment hash and block;
- Git SHA, Solidity/Forge versions;
- ABI hash and action ID;
- explorer URLs.

Generate `gate.json` from the compiler artifact. Never hand-edit a deployed ABI.

## Verify source

MonadVision/Sourcify testnet pattern:

```bash
forge verify-contract \
  <CONTRACT_ADDRESS> \
  src/MonadGate.sol:MonadGate \
  --chain 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/
```

Monad also documents Monadscan/Etherscan verification using `--chain 10143`,
an API key, and `--watch`.

Source:
[Verify with Foundry](https://docs.monad.xyz/guides/verify-smart-contract/foundry).

## Post-deploy chain proof

Claude reproduces with CLI:

1. principal registers distinct agent;
2. principal activates `TRANSFER_MOCK`, cap 10;
3. agent attempt 100 fails with expected custom error;
4. agent attempt 5 succeeds;
5. receipt contains `ActionAttested`;
6. explorer exposes event fields;
7. verified contract page resolves.

## Frontend handoff

Claude hands Codex ABI/address manifests, deploy/action URLs, verified contract
URL, error selectors, observed commands/results, and limitations. Codex
independently probes chain ID/code and runs the browser path.

