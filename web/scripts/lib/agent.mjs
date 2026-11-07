// Piezas comunes de los scripts del agente: configuración, clientes de viem con etiqueta de
// atribución (ERC-8021) en todas las transacciones, y elección de la moneda para el gas.
import { toDataSuffix, verifyTx } from "@celo/attribution-tags";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, erc20Abi, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

export const AGENT_ADDRESS = "0x477fb107278e0a21e39b424ad7b497E7fd472159";
export const EXPLORER = "https://celoscan.io";

export const TOKENS = {
  wARS: { symbol: "wARS", address: "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d", decimals: 18 },
  USDT: { symbol: "USD₮", address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", decimals: 6 },
};

// Stablecoins aceptadas para pagar gas (fee abstraction). En feeCurrency va el adaptador, no el token.
// Verificadas en el FeeCurrencyDirectory de Celo el 2026-10-24.
const GAS_TOKENS = [
  { symbol: "USD₮", token: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", adapter: "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72" },
  { symbol: "USDC", token: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", adapter: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" },
  { symbol: "USA₮", token: "0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771", adapter: "0x0357EE22278c922e1D36cFe6b899269b161880C4" },
];

export function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// Lee web/.env.local sin pisar variables ya definidas en el entorno.
export function loadEnv() {
  try {
    for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}

export const publicClient = createPublicClient({ chain: celo, transport: http() });

// Con clave: cuenta que firma. Sin clave: solo la dirección (sirve para simular).
export function agentAccount({ required }) {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) {
    if (required) fail("Falta AGENT_PRIVATE_KEY en web/.env.local.");
    return null;
  }
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  if (account.address.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) {
    fail(`La clave corresponde a ${account.address}, no a la wallet del agente ${AGENT_ADDRESS}.`);
  }
  return account;
}

export function attributionCode({ required }) {
  const code = process.env.ATTRIBUTION_CODE;
  if (!code && required) fail("Falta ATTRIBUTION_CODE en web/.env.local (el de la entrada del equipo en Loops House).");
  if (code && !/^[a-z0-9_]{1,32}$/.test(code)) fail(`ATTRIBUTION_CODE inválido: "${code}".`);
  return code;
}

// Cliente que agrega la etiqueta de atribución al final del calldata de TODA transacción que envía
// (sendTransaction y writeContract). Así ningún camino del código puede olvidarla.
export function taggedWalletClient(account, code) {
  const suffix = toDataSuffix(code);
  const wallet = createWalletClient({ account, chain: celo, transport: http(), dataSuffix: suffix });
  return wallet;
}

// CELO si hay; si no, la primera stablecoin con saldo. Devuelve { feeCurrency?, label, ok }.
export async function pickGas(address) {
  const celoBal = await publicClient.getBalance({ address });
  if (celoBal > 0n) return { label: "CELO", ok: true };
  for (const t of GAS_TOKENS) {
    const bal = await publicClient.readContract({ address: t.token, abi: erc20Abi, functionName: "balanceOf", args: [address] });
    if (bal > 0n) return { feeCurrency: t.adapter, label: t.symbol, ok: true };
  }
  return { label: "— (sin saldo)", ok: false };
}

export async function balanceOf(token, owner) {
  return publicClient.readContract({ address: token.address, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
}

export function fmt(token, amount) {
  return `${Number(formatUnits(amount, token.decimals)).toLocaleString("es-AR", { maximumFractionDigits: 6 })} ${token.symbol}`;
}

// Confirma que la transacción salió con nuestro código en la etiqueta.
export async function checkTag(hash, code) {
  const tag = await verifyTx({ client: publicClient, hash });
  const ok = !!tag?.codes?.includes(code);
  console.log(`  ${ok ? "✓" : "✗"} etiqueta: ${tag?.codes?.join(", ") ?? "NO ENCONTRADA"}`);
  return ok;
}
