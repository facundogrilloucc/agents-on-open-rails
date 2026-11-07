import type { Address } from "viem";

// Nombre del proyecto: cambiarlo acá cambia toda la app.
export const APP_NAME = "MangoJIT";
export const APP_TAGLINE =
  "Cargás en pesos y tu agente los protege en dólares, con reglas que vos controlás.";

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

// Código de atribución (ERC-8021) de la entrada del equipo en Loops House. Va al final de toda transacción
// que la app le pide firmar al usuario (por ejemplo, los permisos al agente). Es público.
export const ATTRIBUTION_CODE = "celo_d25b3d01e1b4";

// Wallet del agente (EOA). Su clave privada vive solo en .env.local (AGENT_PRIVATE_KEY).
export const AGENT_ADDRESS: Address = "0x477fb107278e0a21e39b424ad7b497E7fd472159";

// Registros ERC-8004 en Celo mainnet (docs.celo.org/build-on-celo/build-with-ai/8004).
export const ERC8004 = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
} as const satisfies Record<string, Address>;

// Identidad ERC-8004 del agente (registrada el 2026-11-07, tx 0xbad2370c…505d).
export const AGENT_ID = 10050;

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
