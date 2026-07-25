# Demo and pitch runbook

## Pre-demo checklist

- UI opens and the top-right badge says `Monad Testnet`.
- Default policy cap is `10 MON`.
- Default attempted transfer is `100 MON`.
- If using live mode, wallet is a funded burner and `VITE_GATE_ADDRESS` is set.
- Keep one successful MonadVision transaction open in a backup browser tab.
- Record the fail-to-pass flow once and keep the video locally.

## 90-second talk track

**0:00–0:15 — Problem**

“Agents can reason and call tools, but the moment they need to transact, we still lack identity, bounded authority, and accountability.”

**0:15–0:30 — Identity**

“This is Atlas, an agent wallet registered to its human principal. The agent may act, but the human stays on the hook.”

**0:30–0:50 — Deny**

Run the default `100 MON` action.

“Atlas asks to transfer 100. Its policy caps this action at 10. MONAD Gate stops it before execution and returns an explicit policy failure.”

**0:50–1:10 — Allow**

Click **Set amount to 5 MON** and run the gate again.

“Now the same action is inside policy. It passes, and Gate creates an attestation binding the agent, principal, action, amount, and result.”

**1:10–1:25 — Prove**

Open the explorer link.

“This is not a dashboard claim. Here is the receipt on Monad.”

**1:25–1:30 — Close**

“We register the agent, set what it may do, block the rest, and leave a receipt on Monad.”

## Judge questions

**Why Monad?** Agent actions are frequent and parallel. Monad gives EVM compatibility while targeting the throughput and low latency an agent economy needs.

**Who signs?** The principal signs registration and policy changes. The agent signs the gated action.

**Does the contract move funds?** Not in this hackathon scope. It proves the permission boundary and creates an attestation immediately before an external action. A production executor can compose this gate with a treasury or tool.

**Can a principal revoke access?** Yes. `setPolicy(..., false)` pauses the agent policy.

**What prevents another wallet impersonating the agent?** `executeGated` reads identity and policy from `msg.sender`; only the registered agent wallet can generate its attestation.

