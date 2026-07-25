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

## Suite status (BE-2, 2026-07-26)

**38 tests, 0 failures**, across six suites under Monad Foundry
`1.7.1-monad-v1.0.0`.

Clean-machine commands — no tribal knowledge, no environment variables:

```bash
git clone --recurse-submodules https://github.com/floating-astronaut/monad-priject.git
cd monad-priject/contracts
forge fmt --check
forge build
forge test
forge snapshot --check
```

`forge-std` was adopted in BE-2. Before it, three test files each declared their
own partial `Vm` interface, so every new cheatcode meant editing a hand-rolled
interface and the files had already drifted apart. It is vendored as a git
submodule pinned at `v1.16.2`, which is why the clone needs
`--recurse-submodules`.

Fuzz and invariant runs are pinned in `foundry.toml` — 512 fuzz runs, 256
invariant runs at depth 500 — so a run here and a run on another machine mean
the same thing.

Coverage against the lists below:

| Requirement | Where |
|---|---|
| registration event, zero-address reject | `testRegistrationEmitsExpectedFields`, `testZeroAddressRegistrationRejected` |
| identity cannot be overwritten | `testPrincipalUnchangedAfterHostileRegister`, `testFuzzRegistrationCannotBeSeized` |
| only principal mutates policy | `testOnlyPrincipalSetsPolicy`, `testFuzzNonPrincipalNeverMutatesPolicy` |
| inactive / wrong action / over cap | `testInactivePolicyRejects`, `testWrongActionRejects`, `testDenyOverCap` |
| at cap passes, one above rejects | `testAmountExactlyAtCapIsAllowed`, `testOneAboveCapIsDenied` |
| event fields match | `testAttestationEmitsExpectedFields`, `testPolicyEmitsExpectedFields` |
| attestation id / replay semantics | `testAttestationIdIsRecomputableFromEventAlone`, `testFuzzReplayAlwaysRejected` |
| rotation behaviour | `MonadGateRotationTest` (6 cases) |
| fuzz: above cap never attests | `testFuzzAboveCapNeverAttests` |
| fuzz: unregistered cannot attest | `testFuzzUnregisteredSenderNeverAttests` |
| fuzz: action mismatch never attests | `testFuzzActionMismatchNeverAttests` |
| **invariant:** nonce only advances on success | `invariant_NonceMatchesAcceptedActions` |
| **invariant:** identity is immutable | `invariant_PrincipalNeverChanges` |

The two invariants are the strongest evidence here: a handler drives the gate
with arbitrary amounts, wrong actions and stranger callers — 128,000 calls per
run — and the nonce must equal the number of calls the contract actually
accepted. That is what makes an attestation id reconstructible off chain
(BE-1b); a nonce that moved on a rejected call would leave gaps a verifier
could not explain.

Not covered, deliberately: the frontend and browser lists below are not
automated. There is no test runner in `ui/`, and adding one is not this lane.
`npm run check` (tsc) is the only automated frontend gate today.

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

