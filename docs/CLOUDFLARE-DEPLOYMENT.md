# Cloudflare Pages Deployment Runbook

Owner: Claude (was Codex; roster changed 2026-07-25)  
Operator approval: Tejas

## Decision

Deploy the existing Vite SPA to **Cloudflare Pages with Git integration**. Do
not add a Worker for the MVP: the app needs no server secret or server state.

Sources:

- [React on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
- [Pages monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)

## Dashboard configuration

```text
Repository: Taurus-Ai-Corp/MONAD-Gate-
Production branch: main
Root directory: ui
Preset: React (Vite)
Build command: npm run build
Output directory: dist
```

Because this is a monorepo, the root must be `ui`.

Recommended watch paths:

```text
Include: ui/*, packages/abi/*
Exclude: docs/*, control-plane/*
```

Source:
[Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).

## Public build variables

Set separately for preview and production:

```text
VITE_CHAIN_ID=10143
VITE_RPC_URL=<deploy-day verified public RPC>
VITE_GATE_ADDRESS=<deployed address>
VITE_EXPLORER_BASE=https://testnet.monadvision.com
VITE_ACTION_ID_TRANSFER_MOCK=<canonical id>
```

These values are public. Never configure a wallet key, seed, Cloudflare token,
or private explorer/RPC credential as `VITE_*`.

## Preview procedure

1. Connect GitHub.
2. Configure preview variables.
3. Push the deployment lane.
4. Confirm Pages built the intended SHA.
5. Open preview in clean Chrome.
6. Check error overlay/console.
7. Test wallet and wrong-network handling.
8. Run live deny/pass.
9. Test 375 px and projector viewports.

## Production promotion

Tejas gives go/no-go after preview evidence. Deploy approved `main` and record
production URL, deployment ID, SHA, timestamp, smoke results, and explorer URLs.

## CLI fallback

```bash
cd ui
npm ci
npm run build
npx wrangler pages project create monad-gate --production-branch main
npx wrangler pages deploy dist --project-name monad-gate --branch main
```

Source: [Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/).

## Rollback

Keep last-known-good deployment URL. On failure, switch demo to it, use
Cloudflare rollback controls, open bounded hotfix lane, and re-run smoke.

## Worker decision gate

Add a Worker only if Tejas later approves a feature requiring protected API
credentials, audit storage, rate limiting, or a server API. Private wallet keys
still require a separate threat model and should not be placed in a general
Worker for this hackathon.

