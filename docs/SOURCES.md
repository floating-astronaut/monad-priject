# Research Sources

Last checked: 2026-07-25. Re-check mutable network/tool pages on deployment day.
Primary sources are project law.

## Monad

- [Introduction](https://docs.monad.xyz/) — EVM/RPC compatibility and current
  architecture/performance overview.
- [Testnet information](https://docs.monad.xyz/developer-essentials/testnets) —
  network, RPC providers/limits, explorers, faucet, resets and revision.
- [Deployment summary](https://docs.monad.xyz/developer-essentials/summary) —
  supported tooling, gas/timing differences, Monad Foundry and viem guidance.
- [Deploy with Monad Foundry](https://docs.monad.xyz/guides/deploy-smart-contract/foundry)
  — install, testnet config, keystore, funding and deployment.
- [Verify with Foundry](https://docs.monad.xyz/guides/verify-smart-contract/foundry)
  — MonadVision/Sourcify and Monadscan verification.
- [JSON-RPC API](https://docs.monad.xyz/reference/json-rpc/api) — chain calls,
  receipts, logs, fees and transaction methods.
- [Changelog](https://docs.monad.xyz/developer-essentials/changelog) — revisions
  and chain configuration.

## Cloudflare

- [React on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
  — Git integration and Vite build/output.
- [Pages monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
  — project root and build behavior.
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
  — root, command, output and build variables.
- [Local development](https://developers.cloudflare.com/pages/functions/local-development/)
  — `wrangler pages dev`.
- [Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/)
  — project/deployment commands.
- [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/)
  — monorepo include/exclude.
- [React + Vite on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
  — optional Worker/API architecture, not MVP.

## Tooling

- [Vite environment variables](https://vite.dev/guide/env-and-mode) — modes,
  env priority and why `VITE_*` values are public.
- [Foundry deploy/verify](https://getfoundry.sh/forge/deploying) — upstream
  dry-run/broadcast behavior; Monad guide wins where different.

## Event

- `TEJAS-CODEV-BRIEF (1).pdf` supplied by Tejas — scope, interface, fail-first
  demo, lane split, kill switches and schedule.

## Agent research rules

1. Official Monad docs own live network facts.
2. Official Cloudflare docs own Pages/Wrangler configuration.
3. Record URL and date for mutable infrastructure.
4. On conflict, stop and update the owning doc before code.
5. Never infer RPC/explorer/faucet values from old hackathon notes.

