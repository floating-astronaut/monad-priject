import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Fingerprint,
  Gauge,
  Link2,
  LockKeyhole,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  ACTION_ID,
  AGENT_ADDRESS,
  connectWallet,
  decodeGateError,
  EXPLORER,
  fetchChainState,
  gateContract,
  LIVE,
  resultHash,
  shortAddress,
  parseAttestation,
  simulateGate,
} from "./gate";
import type { ChainState } from "./gate";

type StepState = "done" | "active" | "idle";
type Receipt = {
  decision: "denied" | "allowed";
  amount: number;
  time: string;
  hash?: string;
  reason?: string;
  /** The contract's own custom error, e.g. SpendCapExceeded(100, 10). */
  detail?: string;
  attestationId?: string;
  nonce?: string;
};

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** Plain-language reading of the contract's custom error. */
function describeGateError(name: string, amount: number, cap: number) {
  switch (name) {
    case "SpendCapExceeded":
      return `Requested ${amount} policy units exceeds the ${cap}-unit cap the principal set.`;
    case "PolicyInactive":
      return "The principal has paused this policy.";
    case "AgentNotRegistered":
      return "This address is not a registered agent.";
    case "ActionNotAllowed":
      return "This is not the action the policy allows.";
    case "ResultAlreadyAttested":
      return "This exact result was already attested — replay rejected.";
    default:
      return "The gate rejected this action.";
  }
}

const DEMO_AGENT = "0xA6E17000000000000000000000000000000A6E17";
const DEMO_PRINCIPAL = "0xA11CE00000000000000000000000000000A11CE";

function App() {
  const [wallet, setWallet] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [registered, setRegistered] = useState(true);
  const [policyActive, setPolicyActive] = useState(true);
  const [maxSpend, setMaxSpend] = useState(10);
  const [amount, setAmount] = useState(100);
  const [running, setRunning] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [history, setHistory] = useState<Receipt[]>([]);
  const [toast, setToast] = useState("");
  const [liveMode] = useState(LIVE);
  const [chain, setChain] = useState<ChainState | null>(null);
  const [chainError, setChainError] = useState("");

  // Live identity and policy are read from the contract on load, so judges see
  // real state before any wallet is connected.
  useEffect(() => {
    if (!LIVE) return;
    let cancelled = false;
    (async () => {
      try {
        const state = await fetchChainState();
        if (cancelled) return;
        setChain(state);
        setRegistered(state.registered);
        setPolicyActive(state.active);
        setMaxSpend(state.cap);
      } catch (error) {
        if (!cancelled) setChainError(decodeGateError(error).detail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const agent = chain?.agent || (LIVE ? AGENT_ADDRESS : wallet || DEMO_AGENT);
  const principal = chain?.principal || (LIVE ? "" : DEMO_PRINCIPAL);
  const allowed = registered && policyActive && amount <= maxSpend;
  const status = !registered ? "Identity missing" : !policyActive ? "Policy paused" : allowed ? "Ready to attest" : "Cap exceeded";

  const steps: { label: string; state: StepState }[] = useMemo(
    () => [
      { label: "Identity", state: registered ? "done" : "active" },
      { label: "Policy", state: registered && policyActive ? "done" : registered ? "active" : "idle" },
      {
        label: "Gate",
        state: receipt ? "done" : registered && policyActive ? "active" : "idle",
      },
      { label: "Proof", state: receipt?.decision === "allowed" ? "active" : "idle" },
    ],
    [registered, policyActive, receipt],
  );

  async function onConnect() {
    setConnecting(true);
    try {
      const connected = await connectWallet();
      setWallet(connected.address);
      if (LIVE && chain && connected.address.toLowerCase() !== chain.agent.toLowerCase()) {
        showToast(`Connected ${shortAddress(connected.address)} — the registered agent is ${shortAddress(chain.agent)}`);
      } else {
        showToast(LIVE ? "Wallet connected · live mode" : "Wallet connected · demo mode");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Wallet connection failed");
    } finally {
      setConnecting(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function runGate() {
    setRunning(true);
    setReceipt(null);

    if (liveMode) {
      await runGateLive();
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 720));

    if (!allowed) {
      const denied: Receipt = {
        decision: "denied",
        amount,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        reason: !registered
          ? "Agent is not registered"
          : !policyActive
            ? "Principal has paused this policy"
            : `Requested ${amount} policy units exceeds the ${maxSpend}-unit policy cap`,
      };
      setReceipt(denied);
      setHistory((items) => [denied, ...items].slice(0, 4));
      setRunning(false);
      return;
    }

    const passed: Receipt = {
      decision: "allowed",
      amount,
      hash: `demo-${crypto.randomUUID().slice(0, 8)}`,
      time: nowLabel(),
    };
    setReceipt(passed);
    setHistory((items) => [passed, ...items].slice(0, 4));
    setRunning(false);
  }

  /**
   * Live path. The allow/deny decision is made by the deployed contract via
   * eth_call, so a denial is real policy evaluation on Monad — not a guess made
   * here. Only the attestation itself needs the agent's signature, and no
   * simulated hash is ever produced on this path.
   */
  async function runGateLive() {
    try {
      const outcome = await simulateGate(agent, amount);

      if (!outcome.allowed) {
        const denied: Receipt = {
          decision: "denied",
          amount,
          time: nowLabel(),
          reason: describeGateError(outcome.error, amount, maxSpend),
          detail: outcome.detail,
        };
        setReceipt(denied);
        setHistory((items) => [denied, ...items].slice(0, 4));
        return;
      }

      if (!wallet) {
        showToast("Policy allows it. Connect the agent wallet to write the attestation.");
        return;
      }

      const connected = await connectWallet();
      const tx = await gateContract(connected.signer).executeGated(
        ACTION_ID,
        amount,
        resultHash(agent, amount),
      );
      const submitted: Receipt = {
        decision: "allowed",
        amount,
        hash: tx.hash,
        time: nowLabel(),
        detail: "Included — waiting for confirmation",
      };
      setReceipt(submitted);
      setHistory((items) => [submitted, ...items].slice(0, 4));
      const confirmed = await tx.wait();
      const attestation = confirmed ? parseAttestation(confirmed) : null;
      setReceipt({
        ...submitted,
        detail: attestation
          ? `Confirmed · nonce ${attestation.nonce} · id recomputable from the event`
          : "Confirmed on Monad",
        attestationId: attestation?.attestationId,
        nonce: attestation?.nonce,
      });
      showToast("Attestation confirmed on Monad");
    } catch (error) {
      showToast(decodeGateError(error).detail);
    } finally {
      setRunning(false);
    }
  }

  function resetDemo() {
    setRegistered(true);
    setPolicyActive(true);
    setMaxSpend(10);
    setAmount(100);
    setReceipt(null);
    setHistory([]);
    showToast("Demo reset · start with the denied action");
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#" aria-label="MONAD Gate home">
          <span className="brand-mark"><LockKeyhole size={17} /></span>
          <span>MONAD</span>
          <span className="brand-divider">|</span>
          <span className="brand-light">Gate</span>
        </a>
        <div className="topbar-right">
          <span className="network-pill"><span className="live-dot" /> Monad Testnet</span>
          <button className="wallet-button" onClick={onConnect} disabled={connecting}>
            {connecting ? <RefreshCw className="spin" size={16} /> : <Wallet size={16} />}
            {wallet ? shortAddress(wallet) : "Connect wallet"}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> Permission & proof for autonomous agents</div>
            <h1>Let agents act.<br /><span>Keep humans accountable.</span></h1>
            <p className="hero-copy">
              Register an agent, define exactly what it may do, gate every action,
              and leave an immutable receipt on Monad.
            </p>
          </div>
          <div className="hero-proof">
            <div className="proof-icon"><ShieldCheck size={23} /></div>
            <div><strong>Principal-controlled</strong><span>Every action traces back to a human.</span></div>
          </div>
        </section>

        <nav className="stepper" aria-label="Gate workflow">
          {steps.map((step, index) => (
            <div className={`step ${step.state}`} key={step.label}>
              <span className="step-number">{step.state === "done" ? <Check size={13} /> : index + 1}</span>
              <span>{step.label}</span>
              {index < steps.length - 1 && <ChevronRight className="step-arrow" size={16} />}
            </div>
          ))}
        </nav>

        <div className="workspace">
          <section className="left-stack">
            <article className="panel identity-panel">
              <PanelHeading icon={<Fingerprint size={18} />} label="01 / IDENTITY" title="Registered actor" />
              <div className="identity-card">
                <div className="agent-avatar"><Bot size={25} /></div>
                <div className="identity-main">
                  <div className="identity-name-row">
                    <strong>{chain?.label || "Atlas Treasury Agent"}</strong>
                    <span className={`verified ${registered ? "" : "off"}`}>
                      {registered ? <Check size={11} /> : <X size={11} />} {registered ? "Verified" : "Unregistered"}
                    </span>
                  </div>
                  <code>{shortAddress(agent)}</code>
                </div>
                {!liveMode && (
                  <button className="icon-toggle" onClick={() => setRegistered((value) => !value)} title="Toggle registration">
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>
              <div className="principal-row">
                <UserRoundCheck size={17} />
                <div><span>Human principal</span><code>{principal ? shortAddress(principal) : "—"}</code></div>
                <div className="liability">LIABLE</div>
              </div>
            </article>

            <article className="panel">
              <PanelHeading icon={<Gauge size={18} />} label="02 / POLICY" title="Action boundary" />
              <div className="policy-grid">
                <div className="policy-field">
                  <span>Allowed action</span>
                  <strong><Zap size={15} /> TRANSFER_MOCK</strong>
                  <code>{ACTION_ID.slice(0, 10)}…{ACTION_ID.slice(-6)}</code>
                </div>
                <div className="policy-field">
                  <span>Maximum spend</span>
                  <div className="cap-input">
                    <input
                      aria-label="Maximum spend"
                      type="number"
                      min="0"
                      value={maxSpend}
                      disabled={liveMode}
                      onChange={(event) => setMaxSpend(Number(event.target.value))}
                    />
                    <b>units</b>
                  </div>
                </div>
              </div>
              <div className="policy-status">
                <div><CircleDot size={16} /><span>Policy status</span></div>
                <button
                  className={`toggle ${policyActive ? "on" : ""}`}
                  onClick={() => !liveMode && setPolicyActive((value) => !value)}
                  disabled={liveMode}
                  aria-label="Toggle policy"
                ><span /></button>
                <strong>{policyActive ? "Active" : "Paused"}</strong>
              </div>
            </article>

            <div className="principle-note">
              <LockKeyhole size={17} />
              <p><strong>The principal stays on the hook.</strong> The agent gets bounded authority—not a blank cheque.</p>
            </div>
          </section>

          <section className="right-stack">
            <article className="panel action-panel">
              <PanelHeading icon={<Play size={18} />} label="03 / GATE" title="Try an action" />
              <div className="amount-label"><span>Action amount · policy units</span><em>{status}</em></div>
              <div className="amount-input">
                <input
                  aria-label="Action amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(event) => { setAmount(Number(event.target.value)); setReceipt(null); }}
                />
                <span>units</span>
              </div>
              <input
                className="range"
                aria-label="Action amount slider"
                type="range"
                min="0"
                max="120"
                value={Math.min(amount, 120)}
                onChange={(event) => { setAmount(Number(event.target.value)); setReceipt(null); }}
              />
              <div className="range-labels"><span>0</span><span className="cap-marker">CAP {maxSpend}</span><span>120 units</span></div>

              <button className="run-button" onClick={runGate} disabled={running}>
                {running ? <><RefreshCw className="spin" size={18} /> Checking policy…</> : <><ShieldCheck size={18} /> Run through Gate <ArrowUpRight size={17} /></>}
              </button>
              <p className="run-caption">
                {liveMode
                  ? "Live contract · the gate decision is made on Monad. Policy units, not MON — no value moves."
                  : "Safe demo mode · no chain call, no funds move"}
              </p>
              {chainError && <p className="run-caption">Chain read failed: {chainError}</p>}
            </article>

            <article className={`decision-card ${receipt?.decision || "empty"}`}>
              {!receipt && (
                <div className="empty-decision">
                  <div><ShieldCheck size={27} /></div>
                  <strong>Awaiting action</strong>
                  <span>Gate checks identity, policy, action, and spend.</span>
                </div>
              )}
              {receipt?.decision === "denied" && (
                <>
                  <div className="decision-top">
                    <span className="decision-icon"><X size={21} /></span>
                    <div><small>DECISION</small><h3>Action denied</h3></div>
                    <span className="decision-time">{receipt.time}</span>
                  </div>
                  <p>{receipt.reason}</p>
                  <div className="reason-code"><span>POLICY_REVERT</span><code>{receipt.detail || `SpendCapExceeded(${amount}, ${maxSpend})`}</code></div>
                  <button className="fix-button" onClick={() => { setAmount(Math.max(1, Math.min(5, maxSpend))); setReceipt(null); }}>
                    Set amount to 5 units <ChevronRight size={15} />
                  </button>
                </>
              )}
              {receipt?.decision === "allowed" && (
                <>
                  <div className="decision-top">
                    <span className="decision-icon"><Check size={21} /></span>
                    <div><small>DECISION</small><h3>Action attested</h3></div>
                    <span className="decision-time">{receipt.time}</span>
                  </div>
                  <p>Policy passed. A tamper-proof receipt binds agent, principal, action, and result.</p>
                  {receipt.detail && <p className="run-caption">{receipt.detail}</p>}
                  <div className="receipt-grid">
                    <span>Agent<strong>{shortAddress(agent)}</strong></span>
                    <span>Amount<strong>{amount} units</strong></span>
                    {receipt.attestationId && (
                      <span>Attestation<strong>{shortAddress(receipt.attestationId)}</strong></span>
                    )}
                    {receipt.nonce !== undefined && (
                      <span>Nonce<strong>{receipt.nonce}</strong></span>
                    )}
                  </div>
                  {receipt.hash?.startsWith("0x") ? (
                    <a className="proof-link" href={`${EXPLORER}/tx/${receipt.hash}`} target="_blank" rel="noreferrer">
                      <Link2 size={16} /> View proof on Monad <ExternalLink size={14} />
                    </a>
                  ) : (
                    <div className="demo-proof"><Link2 size={15} /> Simulated attestation · demo mode only · {receipt.hash}</div>
                  )}
                </>
              )}
            </article>
          </section>
        </div>

        <section className="audit-strip">
          <div className="audit-title">
            <span>Recent decisions</span>
            <button onClick={resetDemo}><RefreshCw size={13} /> Reset demo</button>
          </div>
          <div className="audit-list">
            {history.length === 0 && <p>Run the 100-unit action first. Let the red screen tell the story.</p>}
            {history.map((item, index) => (
              <div className="audit-item" key={`${item.time}-${index}`}>
                <span className={`audit-status ${item.decision}`} />
                <strong>{item.decision === "allowed" ? "ATTESTED" : "DENIED"}</strong>
                <span>TRANSFER_MOCK · {item.amount} units</span>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <span>Built for the agent economy on</span>
        <strong>Monad</strong>
        <span className="footer-dot">·</span>
        <span>Chain ID 10143</span>
        <a href={EXPLORER} target="_blank" rel="noreferrer">Explorer <ExternalLink size={12} /></a>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function PanelHeading({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div className="panel-heading">
      <span className="panel-icon">{icon}</span>
      <div><small>{label}</small><h2>{title}</h2></div>
    </div>
  );
}

export default App;

