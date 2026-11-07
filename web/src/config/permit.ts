import { TOKENS } from "@/config/app";

// EIP-2612 de wARS en Celo mainnet. Dominio leído de eip712Domain() del contrato el 2026-11-07
// (implementación 0xba0030bb…21b9, que tiene permit()).
export const PERMIT_DOMAIN = {
  name: "Peso Argentino",
  version: "1",
  chainId: 42220,
  verifyingContract: TOKENS.wARS.address,
} as const;

export const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

// Cuánto dura una firma de permiso antes de que el agente la presente.
export const PERMIT_TTL_SECONDS = 24 * 60 * 60;
