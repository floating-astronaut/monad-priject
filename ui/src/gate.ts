import {
  AbiCoder,
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  id,
  isAddress,
  keccak256,
  toUtf8Bytes,
  zeroPadValue,
} from "ethers";
import gateAbi from "../../packages/abi/gate.json";
import manifest from "../../packages/abi/addresses.json";

export const CHAIN_ID = 10143;
export const CHAIN_HEX = "0x279f";
export const ACTION_ID = id("TRANSFER_MOCK");

// The address manifest is the source of truth. VITE_* only overrides it, so a
// build can never silently disagree with what BE-3/BE-4 recorded.
export const EXPLORER =
  import.meta.env.VITE_EXPLORER_BASE || manifest.explorerBase;
export const RPC_URL = import.meta.env.VITE_RPC_URL || manifest.rpcUrl;
export const GATE_ADDRESS =
  import.meta.env.VITE_GATE_ADDRESS || manifest.gate || "";
export const AGENT_ADDRESS =
  import.meta.env.VITE_AGENT_ADDRESS || manifest.agent || "";

/** Live mode needs only a deployed address — reading the chain needs no wallet. */
export const LIVE = Boolean(GATE_ADDRESS);

const iface = new Interface(gateAbi as never);
const readProvider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });

export function readContract() {
  return new Contract(GATE_ADDRESS, gateAbi, readProvider);
}

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("Install MetaMask or Rabby to attest on chain.");
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: CHAIN_HEX,
        chainName: "Monad Testnet",
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: [EXPLORER],
      },
    ],
  });
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}

export function gateContract(signer: Awaited<ReturnType<typeof connectWallet>>["signer"]) {
  if (!GATE_ADDRESS) throw new Error("No deployed address — live mode is unavailable.");
  return new Contract(GATE_ADDRESS, gateAbi, signer);
}

/** Confirm the wallet is actually on Monad testnet before offering to write. */
export async function assertCorrectChain(
  provider: Awaited<ReturnType<typeof connectWallet>>["provider"],
) {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    throw new Error(
      `Wallet is on chain ${network.chainId}. Switch to Monad testnet (${CHAIN_ID}) before writing.`,
    );
  }
}

export type ChainState = {
  agent: string;
  principal: string;
  label: string;
  registered: boolean;
  cap: number;
  actionId: string;
  active: boolean;
};

/** Real identity and policy, read from the deployed contract. No wallet needed. */
export async function fetchChainState(agent = AGENT_ADDRESS): Promise<ChainState> {
  const contract = readContract();
  const [identity, policy] = await Promise.all([
    contract.agents(agent),
    contract.policies(agent),
  ]);
  return {
    agent,
    principal: identity[0],
    label: identity[1],
    registered: identity[2],
    cap: Number(policy[0]),
    actionId: policy[1],
    active: policy[2],
  };
}

export type GateOutcome =
  | { allowed: true }
  | { allowed: false; error: string; detail: string };

/**
 * Ask the deployed contract whether it would allow this action.
 *
 * This is an `eth_call` executed by the node against real contract state, so a
 * denial here is the contract's own decision — not a guess made in the browser.
 * It costs nothing and needs no signature, which is what lets the deny half of
 * the demo run before a wallet is ever connected.
 */
export async function simulateGate(agent: string, amount: number): Promise<GateOutcome> {
  try {
    await readContract().executeGated.staticCall(
      ACTION_ID,
      amount,
      resultHash(agent, amount),
      { from: agent },
    );
    return { allowed: true };
  } catch (error) {
    return { allowed: false, ...decodeGateError(error) };
  }
}

/** Turn a revert into the contract's own custom error name and arguments. */
export function decodeGateError(error: unknown): { error: string; detail: string } {
  const revert = (error as { revert?: { name: string; args: unknown[] } })?.revert;
  if (revert?.name) {
    return {
      error: revert.name,
      detail: `${revert.name}(${revert.args.map((a) => String(a)).join(", ")})`,
    };
  }
  const data = extractRevertData(error);
  if (data) {
    try {
      const parsed = iface.parseError(data);
      if (parsed) {
        return {
          error: parsed.name,
          detail: `${parsed.name}(${parsed.args.map((a: unknown) => String(a)).join(", ")})`,
        };
      }
    } catch {
      // not one of ours — fall through to the raw message
    }
  }
  // Wallet-level failures are not contract errors. Ethers wraps them in a
  // paragraph of JSON, which is useless on a projector.
  const code = (error as { code?: string | number })?.code;
  if (code === 4001 || code === "ACTION_REJECTED") {
    return { error: "ACTION_REJECTED", detail: "Rejected in the wallet." };
  }
  if (code === "UNCONFIGURED_NAME") {
    return { error: "BAD_ADDRESS", detail: "That is not a valid address." };
  }
  if (code === "INSUFFICIENT_FUNDS") {
    return { error: "INSUFFICIENT_FUNDS", detail: "This account has no MON for gas." };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: "UNKNOWN", detail: message.split(" (")[0].slice(0, 140) };
}

function extractRevertData(error: unknown): string | null {
  const source = error as Record<string, { data?: unknown } | undefined> & { data?: unknown };
  const candidates = [
    source?.data,
    source?.error?.data,
    (source as { info?: { error?: { data?: unknown } } })?.info?.error?.data,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("0x") && candidate.length >= 10) {
      return candidate;
    }
  }
  return null;
}

export type Attestation = {
  attestationId: string;
  nonce: string;
  amount: string;
  resultHash: string;
};

/**
 * Decode `ActionAttested` from a transaction receipt.
 *
 * Since BE-1b the event carries the nonce, so everything needed to recompute
 * `attestationId` off chain is in the log itself — this is what makes the
 * receipt independently checkable rather than something the UI asserts.
 */
export function parseAttestation(receipt: { logs: readonly unknown[] }): Attestation | null {
  for (const raw of receipt.logs) {
    const log = raw as { topics: readonly string[]; data: string };
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === "ActionAttested") {
        return {
          attestationId: String(parsed.args.attestationId),
          nonce: String(parsed.args.nonce),
          amount: String(parsed.args.amount),
          resultHash: String(parsed.args.resultHash),
        };
      }
    } catch {
      // a log from somewhere else in the transaction
    }
  }
  return null;
}

export type ChainAttestation = {
  attestationId: string;
  agent: string;
  principal: string;
  actionId: string;
  amount: string;
  resultHash: string;
  nonce: string;
  txHash: string;
  blockNumber: number;
  /** True when the id in the log matches a keccak recomputed from the log. */
  verified: boolean;
};

const ATTESTED_TOPIC = id(
  "ActionAttested(bytes32,address,address,bytes32,uint256,bytes32,uint256)",
);

/**
 * Recompute the attestation id from the event's own fields.
 *
 * This is the BE-1b property exercised in the browser: everything needed is in
 * the log, so the page can check the receipt instead of taking it on trust.
 */
export function recomputeAttestationId(a: Omit<ChainAttestation, "verified">) {
  const encoded = AbiCoder.defaultAbiCoder().encode(
    ["uint256", "address", "address", "address", "bytes32", "uint256", "bytes32", "uint256"],
    [CHAIN_ID, GATE_ADDRESS, a.agent, a.principal, a.actionId, a.amount, a.resultHash, a.nonce],
  );
  return keccak256(encoded);
}

/**
 * Read attestations straight from the chain.
 *
 * The public Monad RPC caps `eth_getLogs` at a 100-block range, so this is a
 * rolling window rather than full history — which is what a live demo needs:
 * an attestation written from anywhere, including `cast`, shows up here within
 * seconds without the page ever holding a key.
 */
export async function fetchRecentAttestations(
  agent = AGENT_ADDRESS,
  lookback = 99,
): Promise<ChainAttestation[]> {
  if (!GATE_ADDRESS) return [];
  const latest = await readProvider.getBlockNumber();
  const logs = await readProvider.getLogs({
    address: GATE_ADDRESS,
    topics: [ATTESTED_TOPIC, null, zeroPadValue(agent, 32)],
    fromBlock: Math.max(0, latest - lookback),
    toBlock: latest,
  });

  return logs.map((log) => {
    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    const base = {
      attestationId: String(parsed?.args.attestationId),
      agent: String(parsed?.args.agent),
      principal: String(parsed?.args.principal),
      actionId: String(parsed?.args.actionId),
      amount: String(parsed?.args.amount),
      resultHash: String(parsed?.args.resultHash),
      nonce: String(parsed?.args.nonce),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    };
    return {
      ...base,
      verified: recomputeAttestationId(base).toLowerCase() === base.attestationId.toLowerCase(),
    };
  });
}

/** A wallet with no relationship to this contract. Used to prove refusals. */
export const STRANGER = "0x000000000000000000000000000000000000dEaD";

export type AttackResult = {
  /** True when the contract refused, which is the outcome we want. */
  refused: boolean;
  error: string;
  detail: string;
};

async function attempt(run: () => Promise<unknown>): Promise<AttackResult> {
  try {
    await run();
    return {
      refused: false,
      error: "ALLOWED",
      detail: "The contract permitted this. That is a failure — report it.",
    };
  } catch (error) {
    return { refused: true, ...decodeGateError(error) };
  }
}

/**
 * A compromised agent tries to raise its own spend cap.
 *
 * Run as `eth_call` from the agent address, so it costs nothing and writes
 * nothing — the refusal is the deployed contract evaluating real state.
 */
export function attemptSelfEscalation(agent = AGENT_ADDRESS, newCap = 1000) {
  return attempt(() =>
    readContract().setPolicy.staticCall(agent, newCap, ACTION_ID, true, { from: agent }),
  );
}

/** A stranger registers its own bot and names someone else as the liable principal. */
export function attemptLiabilityAssignment(principal: string) {
  return attempt(() =>
    readContract().registerAgent.staticCall(STRANGER, principal, "evil-bot", { from: STRANGER }),
  );
}

/** An action id the policy does not allow. Real keccak, not a placeholder. */
export const UNDELEGATED_ACTION = id("DRAIN_TREASURY");

/**
 * A result hash this agent has already attested (BE-1b proof tx).
 * Permanent on chain, so replay protection can be demonstrated at any time.
 */
export const SPENT_RESULT_HASH =
  "0xd3f04ffc913093bf36785843fb5b322b82e2233472637c4e4d4cd0b2413f5b90";

/** The agent calls an action that was never delegated to it. */
export function attemptUndelegatedAction(agent = AGENT_ADDRESS) {
  return attempt(() =>
    readContract().executeGated.staticCall(
      UNDELEGATED_ACTION,
      1,
      resultHash(agent, 1),
      { from: agent },
    ),
  );
}

/** The agent replays a result it has already attested once. */
export function attemptReplay(agent = AGENT_ADDRESS) {
  return attempt(() =>
    readContract().executeGated.staticCall(ACTION_ID, 5, SPENT_RESULT_HASH, { from: agent }),
  );
}

export type BoundaryStep = { amount: number; allowed: boolean; detail: string };

/** Walk the exact edge of delegated authority: cap-1, cap, cap+1. */
export async function walkBoundary(agent = AGENT_ADDRESS, cap = 10): Promise<BoundaryStep[]> {
  const amounts = [Math.max(0, cap - 1), cap, cap + 1];
  const steps: BoundaryStep[] = [];
  for (const amount of amounts) {
    const outcome = await simulateGate(agent, amount);
    steps.push({
      amount,
      allowed: outcome.allowed,
      detail: outcome.allowed ? "allowed" : outcome.detail,
    });
  }
  return steps;
}

export function resultHash(agent: string, amount: number) {
  return keccak256(toUtf8Bytes(`${agent}:TRANSFER_MOCK:${amount}:${Date.now()}`));
}

/** Guard before any write, so a bad address fails here and not inside ethers. */
export function isValidAddress(value: string) {
  return isAddress(value);
}

export function shortAddress(value: string) {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
