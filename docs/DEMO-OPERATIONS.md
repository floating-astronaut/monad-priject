# Demo Operations Runbook

## Primary 90-second flow

### 0–15s — identity

“Atlas is a distinct agent wallet. This human principal registered it and is
the only account allowed to change its policy.”

Show both addresses and Monad Testnet badge.

### 15–35s — deny

Agent requests `TRANSFER_MOCK` for 100 against cap 10.

“The agent can ask. It cannot exceed delegated authority.”

Show decoded `SpendCapExceeded(100, 10)` with raw revert available.

### 35–60s — allow

Retry at 5.

“Same agent, same action, now inside policy. Monad accepts the attestation.”

Show submitted → included/confirmed.

### 60–80s — prove

Open Monad transaction, then verified contract.

“The receipt binds agent, principal, action, amount, and result. This is a real
Monad event, not a dashboard claim.”

### 80–90s — close

“MONAD | Gate gives agents bounded authority with human accountability—native
proof on Monad.”

## Five-minute preflight

- Production and last-known-good preview open.
- Wallet profiles show correct principal/agent.
- Accounts funded; RPC returns chain `10143`.
- Code exists at configured address.
- Policy setup state is known.
- Fresh success hash available.
- Explorer tabs and backup video open.
- Hotspot tested; notifications disabled.

## Reset

1. Connect principal.
2. Confirm/register agent.
3. Set cap 10, `TRANSFER_MOCK`, active.
4. Switch to agent profile.
5. Reset UI and preload 100.
6. Do not run until judges watch.

## Fallback order

1. Cloudflare production + live Monad.
2. Known-good preview + live Monad.
3. Local Vite + live Monad.
4. Labeled simulation + recorded explorer proof.
5. Backup video.
6. CLI `cast` proof plus explorer.

Never present levels 4–5 as a live transaction.

## Public evidence card

Keep production URL, repo, contract, verified contract URL, deploy and action
transactions, public wallet addresses, chain ID, Git SHA, architecture sentence,
and limitation sentence.

## Q&A

**Does Gate move funds?** No. It gates and attests permission; a production
executor composes it with the actual tool/payment.

**Who changes policy?** Only the stored human principal.

**Why Monad?** Standard EVM/RPC development plus fast feedback for agent actions,
with the actual contract and proof deployed on Monad—not hypothetical
portability.

**Compromised agent key?** Principal pauses policy. Production adds expiries,
nonces, richer revocation, and rotation.

**Is simulation fake?** It is an explicitly labeled resilience fallback. The
primary path uses real Monad transactions and explorer proof.

