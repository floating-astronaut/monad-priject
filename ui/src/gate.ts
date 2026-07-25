import { BrowserProvider, Contract, id, keccak256, toUtf8Bytes } from "ethers";
import gateAbi from "../../packages/abi/gate.json";

export const CHAIN_ID = 10143;
export const CHAIN_HEX = "0x279f";
export const ACTION_ID = id("TRANSFER_MOCK");
export const EXPLORER =
  import.meta.env.VITE_EXPLORER_BASE || "https://testnet.monadvision.com";
export const GATE_ADDRESS = import.meta.env.VITE_GATE_ADDRESS || "";

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("Install MetaMask or Rabby to use live mode.");
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: CHAIN_HEX,
        chainName: "Monad Testnet",
        nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
        rpcUrls: [import.meta.env.VITE_RPC_URL || "https://testnet-rpc.monad.xyz"],
        blockExplorerUrls: [EXPLORER],
      },
    ],
  });
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}

export function gateContract(signer: Awaited<ReturnType<typeof connectWallet>>["signer"]) {
  if (!GATE_ADDRESS) throw new Error("Set VITE_GATE_ADDRESS to enable live mode.");
  return new Contract(GATE_ADDRESS, gateAbi, signer);
}

export function resultHash(agent: string, amount: number) {
  return keccak256(toUtf8Bytes(`${agent}:TRANSFER_MOCK:${amount}:${Date.now()}`));
}

export function shortAddress(value: string) {
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

