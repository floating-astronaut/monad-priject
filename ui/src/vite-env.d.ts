/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATE_ADDRESS?: string;
  readonly VITE_EXPLORER_BASE?: string;
  readonly VITE_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

