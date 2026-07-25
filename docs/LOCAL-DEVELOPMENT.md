# Local Development Runbook

## Required tools

- Node.js 22 and npm
- Git and GitHub CLI
- Monad Foundry (`forge`, `cast`, `anvil`, `chisel`)
- Chrome with MetaMask or Rabby

Official Monad Foundry installation:

```bash
curl -L https://foundry.category.xyz | bash
foundryup --network monad
```

Source: [Monad Foundry guide](https://docs.monad.xyz/guides/deploy-smart-contract/foundry).

## Clone and orient

```bash
git clone https://github.com/Taurus-Ai-Corp/MONAD-Gate-.git
cd MONAD-Gate-
git status
cat docs/DOC-SYSTEM.md
cat control-plane/ACTIVE_LANE_BOARD.md
```

Each session reads its root agent config, doc map, board, and required docs.

## Frontend

```bash
cd ui
npm ci
cp .env.example .env.local
npm run check
npm run dev
```

Restart Vite after env changes. `VITE_*` values are public, never keys.

Production-equivalent check:

```bash
npm run build
npx wrangler pages dev dist
```

Source: [Pages local development](https://developers.cloudflare.com/pages/functions/local-development/).

## Contracts

```bash
cd contracts
forge --version
forge fmt --check
forge build
forge test -vvv
forge snapshot
```

Start local chain with `anvil`; dry-run deployment locally before testnet.
Claude owns the exact script command. Reference Foundry accounts/keystores,
never pasted private keys.

## Daily preflight

```bash
git status -sb
node --version
npm --version
forge --version
cast chain-id --rpc-url "$MONAD_RPC_URL"
```

Expected testnet chain ID: `10143`. If the RPC disagrees, stop.

## Clean-room acceptance

A clean machine must clone, `npm ci`, build UI, run contract tests, populate only
documented environment values, and reproduce the demo without tribal knowledge.

