import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  id,
  keccak256,
  toUtf8Bytes,
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
  const message = error instanceof Error ? error.message : String(error);
  return { error: "UNKNOWN", detail: message.slice(0, 160) };
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

export function resultHash(agent: string, amount: number) {
  return keccak256(toUtf8Bytes(`${agent}:TRANSFER_MOCK:${amount}:${Date.now()}`));
}

export function shortAddress(value: string) {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
