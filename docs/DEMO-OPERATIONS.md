# Demo Operations Runbook

The operational source of truth for the pitch. `docs/DEMO.md` is retired and
points here — one talk track, so the wording cannot drift again.

## Known-good state

| | |
|---|---|
| Production | https://monad-gate.pages.dev |
| Contract | `0x6e93CE34DB89Cf14C1846Ea65967f5506477F908` (verified) |
| Agent "Atlas" | `0xd00e55Da854b53F02Ff0fe8DD6a35f68a14E2030` |
| Principal | `0xae06174FFd44850FAC43cf8F7D0ECB0848678071` |
| Policy | cap **10 policy units**, `TRANSFER_MOCK`, active |
| Chain | Monad Testnet `10143` |
| Explorer | https://testnet.monadvision.com |

**Say "policy units", never "MON".** Amounts are abstract integers (OP-1 Q8). No
value moves anywhere in this system, and the moment a judge thinks 5 MON changed
hands the demo is misleading.

## No browser wallet is needed

The demo runs end to end without MetaMask, and that is the better story rather
than a workaround:

- **identity and policy** are read from the contract on page load;
- **the denial** is an `eth_call` — the contract's own decision, no signature;
- **the attestation** is signed by the agent from its own keystore with `cast`,
  which is how an autonomous agent actually signs. A human clicking a wallet
  popup is the thing this product exists to replace;
- **the page then shows the attestation appear**, read from chain logs, and
  recomputes the attestation id from the event to prove it matches.

A wallet is only required if you want the browser itself to sign. That path
exists in the UI but is not on the demo track.

## The 90-second track

Roughly 210 spoken words. Read it once against a timer before presenting.

Have two things on screen: the site, and a terminal in `contracts/` with the
preflight exports already set.

**0:00–0:12 — the problem**

> "Agents can reason and call tools. The moment one needs to act, we have no
> answer to three questions: who authorised it, what is it allowed to do, and
> who is liable when it goes wrong."

**0:12–0:25 — identity**

*Point at the identity panel. It is already populated — that state is read from
the contract, not typed in.*

> "This is Atlas, an agent wallet registered on Monad to a human principal. That
> human is the only account that can change what Atlas may do, and stays liable
> for it."

**0:25–0:45 — deny**

*The amount is preloaded at 100 against a cap of 10. Click **Run through Gate**.*

> "Atlas asks to act with 100 units. Its policy caps this action at 10. That
> refusal is not my frontend deciding — the contract evaluated it on Monad and
> returned SpendCapExceeded, one hundred against ten."

**0:45–1:05 — allow**

*Switch to the terminal. The agent signs for itself:*

```bash
cast send $GATE "executeGated(bytes32,uint256,bytes32)" \
  $(cast keccak "TRANSFER_MOCK") 5 $(cast keccak "demo-$(date +%s)") \
  --account monad-agent --password-file ~/.monad-gate/agent.pass --rpc-url $RPC
```

> "Same agent, same action, now inside policy — and the agent signs this itself
> from its own key, which is the whole point. No human clicking a wallet."

**1:05–1:20 — prove**

*Go back to the page. Within a few seconds the attestation appears in Recent
decisions on its own.*

> "The page didn't take my word for that. It read the event from Monad,
> recomputed the attestation id from the log, and is telling you the id matches.
> That is verification, not a dashboard claim."

*Click through to MonadVision for the receipt.*

**1:25–1:30 — close**

> "Register the agent, bound what it may do, block the rest, leave proof on
> Monad."

## Five-minute preflight

Run this from the build box:

```bash
export GATE=0x6e93CE34DB89Cf14C1846Ea65967f5506477F908
export AGENT=0xd00e55Da854b53F02Ff0fe8DD6a35f68a14E2030
export RPC=https://testnet-rpc.monad.xyz

cast chain-id --rpc-url $RPC                                    # expect 10143
cast code $GATE --rpc-url $RPC | wc -c                          # expect ~7968, not 2
cast call $GATE "policies(address)(uint256,bytes32,bool)" $AGENT --rpc-url $RPC
cast balance $AGENT --rpc-url $RPC --ether                      # agent can still sign
```

Then, in the browser:

- production loads, badge reads **Monad Testnet**, identity shows Atlas and the
  principal — if those are blank the RPC read failed, stop and fix it;
- amount is preloaded at 100, cap reads 10, everything says **units**;
- agent profile is the connected wallet, on chain 10143;
- explorer tab open on the contract; backup video open on the second device;
- notifications off, hotspot tested.

## Reset between runs

The gate rejects a repeated result hash, but the UI derives a fresh one per
attempt, so back-to-back runs are safe.

1. Reload the page — identity and policy re-read from chain.
2. Set the amount back to 100.
3. Do not run it until judges are watching. The denial is the hook.

If the policy was paused or the cap changed during Q&A, open **Principal
controls**, connect the principal wallet, set the cap back to 10 and resume.

## Fallback ladder

1. **Production + live Monad** — the intended path, and it needs no wallet.
2. **Last-known-good deployment URL** + live Monad. Every deployment keeps its
   own permanent URL; the previous one is listed in the Cloudflare dashboard.
3. **Local Vite** (`cd ui && npm run dev`) + live Monad. The address comes from
   the manifest, so this needs no configuration.
4. **Deny-only, no wallet.** The refusal is an `eth_call`, so it works with no
   wallet and no signature at all. If the wallet or the agent's balance fails,
   the denial half of the story is *still real* — say plainly that the
   attestation step is being shown from a recording.
5. **`cast` at the terminal** — the preflight commands above prove identity,
   policy and the denial live, in front of the judges.
6. **Backup video**, clearly announced as a recording.

Never present 4–6 as a live transaction.

## Public evidence card

Have this on screen or on paper:

```text
Live      https://monad-gate.pages.dev
Repo      https://github.com/floating-astronaut/monad-priject
Contract  0x6e93CE34DB89Cf14C1846Ea65967f5506477F908   (Sourcify exact_match)
Deploy tx 0x047764f4e78306050569846b7bc3fcffe89277af8f2465acd960dd8d7da9f1a1
Proof tx  0x74f68eb7de5246d7fbfcdab49794210e48163cc33040048c5e396cdfcc9ab688
Agent     0xd00e55Da854b53F02Ff0fe8DD6a35f68a14E2030
Principal 0xae06174FFd44850FAC43cf8F7D0ECB0848678071
Chain     10143 · MonadVision · no backend, no database
```

## Q&A

**Does Gate move funds?**
No. It gates permission and attests it. A successful attestation proves the
policy allowed the action — not that any downstream work happened. A production
executor composes this gate with the actual tool or treasury.

**So what are the numbers?**
Abstract policy units. Deliberately not a token amount, so nobody can read the
demo as a payment.

**Who can change policy?**
Only the stored principal. An unrelated caller cannot overwrite a registered
agent, and principal and agent can never be the same address — both enforced in
the contract and regression-tested.

**Is the denial real, or a UI check?**
Real. The UI calls the deployed contract and renders the custom error it returns.
You can reproduce it from a terminal with `cast call` — no wallet needed.

**What if the agent key is stolen?**
The principal pauses the policy, or calls `rotateAgent` to move the identity to
a fresh address, carrying the policy and clearing the old slot. Expiries and
richer revocation are post-hackathon.

**Can an attestation be forged or replayed?**
`executeGated` authenticates `msg.sender`, so only the registered agent can
produce its attestation, and the same result hash cannot be attested twice by
that agent. A known limit, tested rather than hidden: rotation moves an identity
to an address with an empty replay set.

**How do I verify any of this myself?**
The contract is source-verified on Sourcify, the deployed bytecode is
byte-identical to the artifact, and the attestation id is recomputable off chain
from the event alone. The README has copy-pasteable commands.

**Why Monad?**
Agent actions are frequent, parallel and small. Monad keeps standard EVM tooling
while targeting the throughput and latency that makes per-action gating
practical — and this is deployed and verified on Monad, not a portability claim.

**What did you deliberately not build?**
Multi-chain, custody, compliance workflows, agent swarms, an off-chain database.
One policy, one action, one chain — the smallest credible permission-and-proof
layer.
