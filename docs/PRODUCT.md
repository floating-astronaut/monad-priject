# MONAD | Gate — Product Contract

## Product statement

MONAD | Gate is a thin permission-and-proof layer for autonomous agents on
Monad. It binds an agent wallet to a human principal, constrains that agent with
an explicit policy, blocks out-of-policy actions, and emits a verifiable
attestation for allowed actions.

## Required product surface

1. **Register** — an agent wallet, human principal, and readable agent label.
2. **Policy** — one allowed action, a maximum spend, and an active/paused state.
3. **Gate** — a pre-action decision that fails explicitly when policy is
   violated.
4. **Attest** — an on-chain event binding agent, principal, action, amount, and
   result hash.

## Demo contract

The primary demo is intentionally fail-first:

1. Show Atlas registered to its liable principal.
2. Attempt `TRANSFER_MOCK` for 100 MON against a 10 MON maximum.
3. Show a red `SpendCapExceeded(100, 10)` decision.
4. Reduce the request to 5 MON and retry.
5. Show the successful attestation and, in live mode, its MonadVision link.

The app must support a no-wallet demo mode so unreliable venue connectivity
does not prevent the story. Demo mode must be visibly labeled and must not
present a simulated receipt as an on-chain transaction.

## Non-goals

- Custody or transfer of real funds
- Full compliance or liability adjudication
- Multi-chain or Hedera support
- Agent swarms
- General-purpose chatbot UI
- Marketing-site content beyond the product demo

## Acceptance

- UI loads in demo mode without a wallet.
- Default 100 MON attempt is denied against a 10 MON policy.
- One interaction changes the request to 5 MON.
- The 5 MON attempt is allowed and produces a clearly labeled receipt.
- Pausing the policy or unregistering the agent blocks the action.
- Live mode is enabled only when a contract address is configured.
- Contract tests cover deny, allow, and principal-only policy mutation.

