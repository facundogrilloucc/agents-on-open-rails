import type { Address } from "viem";

// Nombre provisorio: cambiarlo acá cambia toda la app.
export const APP_NAME = "Tesorería JIT";
export const APP_TAGLINE =
  "Cargás en pesos, tu agente lo protege en dólares y paga por uso las herramientas que necesitás.";

export type Token = {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
};

// Direcciones verificadas en Celo mainnet (chain id 42220) leyendo symbol() y decimals().
export const TOKENS = {
  wARS: {
    symbol: "wARS",
    name: "Peso argentino (Ripio)",
    address: "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d",
    decimals: 18,
  },
  USDT: {
    symbol: "USD₮",
    name: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    decimals: 6,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    decimals: 6,
  },
} as const satisfies Record<string, Token>;

export const EXPLORER_URL = "https://celoscan.io";

// Wallet del agente (EOA). Su clave privada vive solo en .env.local (AGENT_PRIVATE_KEY).
export const AGENT_ADDRESS: Address = "0x477fb107278e0a21e39b424ad7b497E7fd472159";

// Registros ERC-8004 en Celo mainnet (docs.celo.org/build-on-celo/build-with-ai/8004).
export const ERC8004 = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
} as const satisfies Record<string, Address>;

// Link de la rampa de Ripio (sin credenciales). Si están todos los parámetros,
// el usuario va directo al flujo de compra de wARS en Celo.
export function ripioOnrampUrl(address: Address, amountArs?: number) {
  const params = new URLSearchParams({
    country: "AR",
    chain: "42220",
    token: "WARS",
    address,
  });
  if (amountArs) params.set("amount", String(amountArs));
  return `https://ramp.ripio.com/?${params.toString()}`;
}
