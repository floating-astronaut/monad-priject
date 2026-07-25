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
  attemptLiabilityAssignment,
  attemptReplay,
  attemptSelfEscalation,
  attemptUndelegatedAction,
  assertCorrectChain,
  connectWallet,
  decodeGateError,
  EXPLORER,
  fetchChainState,
  fetchRecentAttestations,
  gateContract,
  isValidAddress,
  readContract,
  LIVE,
  resultHash,
  shortAddress,
  parseAttestation,
  simulateGate,
} from "./gate";
import { walkBoundary } from "./gate";
import type { AttackResult, BoundaryStep, ChainAttestation, ChainState } from "./gate";

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
    case "PrincipalIsAgent":
      return "You are connected as the agent. Registration must be signed by the principal, and an agent can never be its own principal.";
    case "AgentAlreadyRegistered":
      return "That agent is already registered. Change the agent address to register a new one, or use the policy controls below.";
    case "NotPrincipal":
      return "Only the principal that registered this agent may do that.";
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
  const [onchain, setOnchain] = useState<ChainAttestation[]>([]);

  // Two attacks, run as eth_call so they cost nothing and write nothing. The
  // cap answers "how much"; these answer "who decides" — which is the part a
  // compromised agent actually attacks.
  const [attacks, setAttacks] = useState<Record<string, AttackResult | "running">>({});
  const [boundary, setBoundary] = useState<BoundaryStep[] | "running" | null>(null);

  async function runBoundary() {
    setBoundary("running");
    try {
      setBoundary(await walkBoundary(agent, maxSpend));
    } catch {
      setBoundary(null);
    }
  }

  async function runAttack(key: string, run: () => Promise<AttackResult>) {
    setAttacks((prev) => ({ ...prev, [key]: "running" }));
    try {
      const result = await run();
      setAttacks((prev) => ({ ...prev, [key]: result }));
    } catch (error) {
      setAttacks((prev) => ({
        ...prev,
        [key]: { refused: false, error: "ERROR", detail: decodeGateError(error).detail },
      }));
    }
  }

  // Attestations are read from the chain on a short poll. An attestation
  // written from anywhere — including `cast` at a terminal — appears here
  // within seconds, so the demo never needs this page to hold a key.
  useEffect(() => {
    if (!LIVE) return;
    let stop = false;
    const tick = async () => {
      try {
        const found = await fetchRecentAttestations();
        if (!stop) setOnchain(found.slice().reverse());
      } catch {
        // a poll that fails is not worth surfacing; the next one retries
      }
    };
    tick();
    const timer = window.setInterval(tick, 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

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

  // --- FE-2: principal setup -------------------------------------------
  // Q3 preconfigures registration and policy, so this stays collapsed and off
  // the demo path. It exists because Q3 also says setup must remain runnable
  // live if judges ask to see it.
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupAgent, setSetupAgent] = useState(AGENT_ADDRESS);
  const [setupLabel, setSetupLabel] = useState("Atlas");
  const [setupCap, setSetupCap] = useState(10);
  const [setupBusy, setSetupBusy] = useState("");
  const [setupStage, setSetupStage] = useState<"" | "submitted" | "confirmed" | "error">("");
  const [setupHash, setSetupHash] = useState("");
  const [setupMessage, setSetupMessage] = useState("");

  const isPrincipal =
    Boolean(wallet) && Boolean(chain?.principal) &&
    wallet.toLowerCase() === chain!.principal.toLowerCase();

  /** Shared write path: connect, verify the chain, submit, then confirm. */
  async function runSetup(
    action: string,
    method: "registerAgent" | "setPolicy",
    buildArgs: (from: string) => unknown[],
  ) {
    setSetupBusy(action);
    setSetupStage("");
    setSetupHash("");
    setSetupMessage("");

    // Validate before connecting, so a bad address fails here instead of
    // inside ethers — an empty string reaches the provider as an ENS lookup
    // and surfaces as an unreadable UNCONFIGURED_NAME error.
    if (!isValidAddress(setupAgent)) {
      setSetupStage("error");
      setSetupMessage("Agent address is not a valid address.");
      setSetupBusy("");
      return;
    }

    try {
      const connected = await connectWallet();
      setWallet(connected.address);
      await assertCorrectChain(connected.provider);

      // Use the address just returned by the wallet, never the `wallet` state:
      // on the first click that state is still empty inside this closure.
      const args = buildArgs(connected.address);

      // Ask the contract first. Connecting costs nothing, so a write that will
      // revert should be reported here rather than after a signature — the old
      // behaviour made you sign, wait, and then read a raw custom error.
      await (readContract() as unknown as Record<string, { staticCall: (...a: unknown[]) => Promise<unknown> }>)[
        method
      ].staticCall(...args, { from: connected.address });

      const contract = gateContract(connected.signer) as unknown as Record<
        string,
        (...a: unknown[]) => Promise<{ hash: string; wait: () => Promise<unknown> }>
      >;
      const tx = await contract[method](...args);
      setSetupHash(tx.hash);
      setSetupStage("submitted");
      setSetupMessage(`${action} submitted`);

      await tx.wait();
      setSetupStage("confirmed");
      setSetupMessage(`${action} confirmed`);

      const refreshed = await fetchChainState();
      setChain(refreshed);
      setRegistered(refreshed.registered);
      setPolicyActive(refreshed.active);
      setMaxSpend(refreshed.cap);
    } catch (error) {
      const decoded = decodeGateError(error);
      const plain = describeGateError(decoded.error, setupCap, maxSpend);
      setSetupStage("error");
      // Lead with why, keep the contract's own error after it — the audience
      // for this panel wants both.
      setSetupMessage(
        plain === "The gate rejected this action."
          ? decoded.detail
          : `${plain} (${decoded.detail})`,
      );
    } finally {
      setSetupBusy("");
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
          <a className="nav-link" href="/deck">Deck</a>
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

            <article className="panel setup-panel">
              <button
                className="setup-toggle"
                onClick={() => setSetupOpen((open) => !open)}
                aria-expanded={setupOpen}
              >
                <span><Wallet size={16} /> Principal controls</span>
                <em>{setupOpen ? "hide" : "setup is preconfigured — open to run it live"}</em>
              </button>

              {setupOpen && (
                <div className="setup-body">
                  {!liveMode && <p className="run-caption">Demo mode — no contract to write to.</p>}
                  {liveMode && !wallet && (
                    <p className="run-caption">Connect the principal wallet to register or change policy.</p>
                  )}
                  {liveMode && wallet && !isPrincipal && (
                    <p className="run-caption">
                      Connected {shortAddress(wallet)} is not the registered principal
                      ({chain?.principal ? shortAddress(chain.principal) : "unknown"}). The contract will
                      reject these writes with NotPrincipal.
                    </p>
                  )}

                  <label className="setup-field">
                    <span>Agent address</span>
                    <input value={setupAgent} onChange={(e) => setSetupAgent(e.target.value)} spellCheck={false} />
                  </label>
                  <label className="setup-field">
                    <span>Label</span>
                    <input value={setupLabel} onChange={(e) => setSetupLabel(e.target.value)} />
                  </label>
                  <label className="setup-field">
                    <span>Spend cap · policy units</span>
                    <input
                      type="number"
                      min="0"
                      value={setupCap}
                      onChange={(e) => setSetupCap(Number(e.target.value))}
                    />
                  </label>

                  {liveMode && chain?.registered &&
                    setupAgent.toLowerCase() === chain.agent.toLowerCase() && (
                    <p className="run-caption" style={{ marginTop: 0 }}>
                      {chain.label || "This agent"} is already registered to{" "}
                      {shortAddress(chain.principal)}, so <b>Register</b> will be refused —
                      change the agent address to register a new one. Policy controls below
                      work as normal.
                    </p>
                  )}

                  <div className="setup-actions">
                    <button
                      disabled={!liveMode || Boolean(setupBusy)}
                      onClick={() =>
                        runSetup("Registration", "registerAgent", (from) => [
                          setupAgent,
                          from,
                          setupLabel,
                        ])
                      }
                    >
                      {setupBusy === "Registration" ? <RefreshCw className="spin" size={14} /> : <Fingerprint size={14} />}
                      Register agent
                    </button>
                    <button
                      disabled={!liveMode || Boolean(setupBusy)}
                      onClick={() =>
                        runSetup("Policy", "setPolicy", () => [setupAgent, setupCap, ACTION_ID, true])
                      }
                    >
                      {setupBusy === "Policy" ? <RefreshCw className="spin" size={14} /> : <Gauge size={14} />}
                      Set policy
                    </button>
                    <button
                      disabled={!liveMode || Boolean(setupBusy)}
                      onClick={() =>
                        runSetup(policyActive ? "Pause" : "Resume", "setPolicy", () => [
                          setupAgent,
                          setupCap,
                          ACTION_ID,
                          !policyActive,
                        ])
                      }
                    >
                      {setupBusy === "Pause" || setupBusy === "Resume" ? (
                        <RefreshCw className="spin" size={14} />
                      ) : (
                        <CircleDot size={14} />
                      )}
                      {policyActive ? "Pause policy" : "Resume policy"}
                    </button>
                  </div>

                  {setupStage && (
                    <div className={`setup-status ${setupStage}`}>
                      <strong>
                        {setupStage === "submitted" && "Included"}
                        {setupStage === "confirmed" && "Confirmed"}
                        {setupStage === "error" && "Rejected"}
                      </strong>
                      <span>{setupMessage}</span>
                      {setupHash && (
                        <a href={`${EXPLORER}/tx/${setupHash}`} target="_blank" rel="noreferrer">
                          {shortAddress(setupHash)} <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </article>

            <article className="panel attack-panel">
              <PanelHeading
                icon={<ShieldCheck size={18} />}
                label="ATTACK SURFACE"
                title="Try to break it"
              />
              <p className="run-caption" style={{ marginTop: 0 }}>
                Both run as <code>eth_call</code> against the deployed contract — no wallet, no gas,
                nothing written. The refusal is the chain&apos;s, not this page&apos;s.
              </p>

              {[
                {
                  key: "escalate",
                  title: "Compromised agent raises its own cap to 1000",
                  sub: "setPolicy · called by the agent itself",
                  why: "Stealing the agent key does not widen what it may do.",
                  run: () => attemptSelfEscalation(agent),
                },
                {
                  key: "liability",
                  title: "A stranger makes someone else liable for their bot",
                  sub: "registerAgent · naming a principal who never consented",
                  why: "Liability has to be accepted. This is the whole product.",
                  run: () => attemptLiabilityAssignment(principal || AGENT_ADDRESS),
                },
                {
                  key: "undelegated",
                  title: "The bot calls an action it was never delegated",
                  sub: "executeGated · DRAIN_TREASURY",
                  why: "Scope is enumerated, not assumed.",
                  run: () => attemptUndelegatedAction(agent),
                },
                {
                  key: "replay",
                  title: "The bot replays a result it already attested",
                  sub: "executeGated · a result hash spent earlier",
                  why: "Each attestation is a provably unique action.",
                  run: () => attemptReplay(agent),
                },
              ].map((a) => {
                const result = attacks[a.key];
                return (
                  <div className="attack-row" key={a.key}>
                    <button
                      className="attack-button"
                      disabled={!liveMode || result === "running"}
                      onClick={() => runAttack(a.key, a.run)}
                    >
                      <strong>{a.title}</strong>
                      <em>{a.sub}</em>
                    </button>
                    {result === "running" && (
                      <div className="attack-result pending">
                        <RefreshCw className="spin" size={13} /> asking the contract…
                      </div>
                    )}
                    {result && result !== "running" && (
                      <div className={`attack-result ${result.refused ? "refused" : "allowed"}`}>
                        <span className="attack-verdict">
                          {result.refused ? <Check size={12} /> : <X size={12} />}
                          {result.refused ? "REFUSED BY THE CHAIN" : "ALLOWED — REPORT THIS"}
                        </span>
                        <code>{result.detail}</code>
                        {result.refused && <span className="attack-why">{a.why}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="attack-row">
                <button
                  className="attack-button"
                  disabled={!liveMode || boundary === "running"}
                  onClick={runBoundary}
                >
                  <strong>Walk the boundary — {Math.max(0, maxSpend - 1)}, {maxSpend}, {maxSpend + 1}</strong>
                  <em>three calls · finds the exact edge of authority</em>
                </button>
                {boundary === "running" && (
                  <div className="attack-result pending">
                    <RefreshCw className="spin" size={13} /> asking the contract…
                  </div>
                )}
                {Array.isArray(boundary) && (
                  <div className="attack-result refused boundary-result">
                    {boundary.map((step) => (
                      <div className="boundary-step" key={step.amount}>
                        <span className={`boundary-chip ${step.allowed ? "ok" : "no"}`}>
                          {step.allowed ? <Check size={11} /> : <X size={11} />} {step.amount}
                        </span>
                        <code>{step.detail}</code>
                      </div>
                    ))}
                    <span className="attack-why">
                      The edge is exactly where the principal put it — not one unit either side.
                    </span>
                  </div>
                )}
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
            {liveMode && onchain.length > 0 && (
              <>
                {onchain.map((item) => (
                  <div className="audit-item onchain" key={item.attestationId}>
                    <span className="audit-status allowed" />
                    <strong>ATTESTED</strong>
                    <span>
                      TRANSFER_MOCK · {item.amount} units · nonce {item.nonce}
                    </span>
                    <span className={`id-check ${item.verified ? "ok" : "bad"}`}>
                      {item.verified ? <Check size={11} /> : <X size={11} />}
                      {item.verified ? "id verified from the log" : "id mismatch"}
                    </span>
                    <a href={`${EXPLORER}/tx/${item.txHash}`} target="_blank" rel="noreferrer">
                      {shortAddress(item.txHash)} <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </>
            )}
            {liveMode && onchain.length === 0 && (
              <p>No attestation in the last 100 blocks. Run one — from this page or from `cast` — and it appears here.</p>
            )}
            {!liveMode && history.length === 0 && <p>Run the 100-unit action first. Let the red screen tell the story.</p>}
            {history.filter((item) => item.decision === "denied" || !liveMode).map((item, index) => (
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

