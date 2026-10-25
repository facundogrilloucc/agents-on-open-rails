// Registra la identidad ERC-8004 del agente en Celo mainnet, con etiqueta de atribución.
//
//   node scripts/register-agent.mjs          → simulación (no envía nada)
//   node scripts/register-agent.mjs --send   → envía la transacción (gasta gas)
//
// Lee .env.local (ver .env.example). Si la wallet no tiene CELO, paga el gas en USD₮, USDC o USA₮.
import { codeFromRepo, toDataSuffix, verifyTx } from "@celo/attribution-tags";
import { readFileSync } from "node:fs";
import {
  createPublicClient, createWalletClient, encodeFunctionData, concat, erc20Abi,
  formatUnits, http, parseAbi, parseEventLogs, zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const AGENT_ADDRESS = "0x477fb107278e0a21e39b424ad7b497E7fd472159";
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
// Stablecoins aceptadas para pagar gas (fee abstraction). En feeCurrency va el adaptador, no el token.
// Verificadas en el FeeCurrencyDirectory de Celo (0x15F3…6276) el 2026-10-24.
const GAS_TOKENS = [
  { symbol: "USD₮", token: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", adapter: "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72" },
  { symbol: "USDC", token: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", adapter: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" },
  { symbol: "USA₮", token: "0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771", adapter: "0x0357EE22278c922e1D36cFe6b899269b161880C4" },
];
const abi = parseAbi([
  "function register(string agentURI) returns (uint256 agentId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
function fail(msg) { console.error(`✗ ${msg}`); process.exit(1); }

loadEnv(new URL("../.env.local", import.meta.url));
const send = process.argv.includes("--send");
const { AGENT_PRIVATE_KEY, ATTRIBUTION_CODE, GITHUB_REPO, AGENT_URI } = process.env;

// 1. Etiqueta de atribución: obligatoria y tiene que coincidir con el repo inscripto.
if (!ATTRIBUTION_CODE) fail("Falta ATTRIBUTION_CODE en .env.local (lo da la inscripción).");
if (GITHUB_REPO && codeFromRepo(GITHUB_REPO) !== ATTRIBUTION_CODE) {
  fail(`ATTRIBUTION_CODE no coincide con ${GITHUB_REPO} (esperado ${codeFromRepo(GITHUB_REPO)}).`);
}
const suffix = toDataSuffix(ATTRIBUTION_CODE);

// 2. Cuenta: con clave para enviar; sin clave solo se puede simular.
let account = AGENT_ADDRESS;
if (AGENT_PRIVATE_KEY) {
  account = privateKeyToAccount(AGENT_PRIVATE_KEY.startsWith("0x") ? AGENT_PRIVATE_KEY : `0x${AGENT_PRIVATE_KEY}`);
  if (account.address.toLowerCase() !== AGENT_ADDRESS.toLowerCase()) {
    fail(`La clave corresponde a ${account.address}, no a la wallet del agente ${AGENT_ADDRESS}.`);
  }
} else if (send) {
  fail("Falta AGENT_PRIVATE_KEY en .env.local para enviar.");
}
const from = typeof account === "string" ? account : account.address;

// 3. URI del archivo de registro (sin "registrations" en la primera publicación).
const uri = AGENT_URI || `data:application/json;base64,${Buffer.from(
  readFileSync(new URL("../public/agent-registration.json", import.meta.url)),
).toString("base64")}`;

const pub = createPublicClient({ chain: celo, transport: http() });
const data = concat([encodeFunctionData({ abi, functionName: "register", args: [uri] }), suffix]);

// 4. Gas: CELO si hay; si no, la primera stablecoin con saldo, vía su adaptador de fee currency.
const celoBal = await pub.getBalance({ address: from });
const stableBals = await Promise.all(
  GAS_TOKENS.map((t) => pub.readContract({ address: t.token, abi: erc20Abi, functionName: "balanceOf", args: [from] })),
);
const gasToken = celoBal === 0n ? GAS_TOKENS.find((_, i) => stableBals[i] > 0n) : undefined;
const feeCurrency = gasToken?.adapter;
const hasGas = celoBal > 0n || !!gasToken;
console.log(`Wallet: ${from}`);
console.log(`Saldo: ${formatUnits(celoBal, 18)} CELO · ${GAS_TOKENS.map((t, i) => `${formatUnits(stableBals[i], 6)} ${t.symbol}`).join(" · ")}`);
console.log(`Gas en: ${gasToken ? gasToken.symbol : hasGas ? "CELO" : "— (sin saldo)"}`);
console.log(`Etiqueta: ${ATTRIBUTION_CODE} · URI: ${uri.length > 80 ? `${uri.slice(0, 80)}… (${uri.length} caracteres)` : uri}`);

// 5. Simulación (no gasta nada).
try {
  await pub.call({ account: from, to: IDENTITY_REGISTRY, data });
  const gas = await pub.estimateGas({ account: from, to: IDENTITY_REGISTRY, data });
  console.log(`✓ Simulación OK · gas estimado ${gas}`);
} catch (e) {
  if (!send) console.log(`⚠ La simulación falló (normal si la wallet no tiene saldo para gas): ${e.shortMessage ?? e.message}`);
  else fail(`La simulación falló: ${e.shortMessage ?? e.message}`);
}
if (!send) { console.log("\nModo simulación. Para registrar de verdad: node scripts/register-agent.mjs --send"); process.exit(0); }
if (!hasGas) fail("La wallet no tiene CELO, USD₮, USDC ni USA₮ para pagar el gas.");

// 6. Envío, confirmación y verificación de la etiqueta.
const wallet = createWalletClient({ account, chain: celo, transport: http() });
const hash = await wallet.sendTransaction({ to: IDENTITY_REGISTRY, data, ...(feeCurrency ? { feeCurrency } : {}) });
console.log(`Enviada: https://celoscan.io/tx/${hash}`);
const receipt = await pub.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") fail("La transacción falló.");

// El agentId se lee del evento (mint del NFT), no del valor de retorno.
const minted = parseEventLogs({ abi, logs: receipt.logs, eventName: "Transfer" })
  .find((l) => l.address.toLowerCase() === IDENTITY_REGISTRY.toLowerCase() && l.args.from === zeroAddress);
const tag = await verifyTx({ client: pub, hash });
console.log(`✓ Agente registrado · agentId ${minted?.args.tokenId ?? "?"}`);
console.log(`✓ Etiqueta en la transacción: ${tag?.codes?.join(", ") ?? "NO ENCONTRADA"}`);
console.log(`\nSiguiente: agregar "registrations": [{ "agentId": ${minted?.args.tokenId ?? "<id>"}, "agentRegistry": "eip155:42220:${IDENTITY_REGISTRY}" }] al archivo de registro.`);
