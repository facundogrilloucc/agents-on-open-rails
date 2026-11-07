// El agente protege pesos: convierte wARS → USD₮ en Textile FX (RFQ, docs.textilecredit.com).
//
//   node scripts/agent-protect.mjs <monto wARS>                      → simulación con la wallet del agente
//   node scripts/agent-protect.mjs <monto wARS> --send               → convierte wARS que tiene el agente
//   node scripts/agent-protect.mjs <monto wARS> --user 0x… [--send]  → toma los wARS del usuario con su
//        permiso (transferFrom), convierte y le devuelve los USD₮ (custodia por permiso con tope)
//
// Todas las transacciones van con la etiqueta de atribución (ATTRIBUTION_CODE). Textile sin API key:
// el agente firma una prueba de control (EIP-712 "Textile Taker Control") con su propia wallet.
import { randomBytes } from "node:crypto";
import { erc20Abi, getAddress, isAddress, parseUnits } from "viem";
import { celo } from "viem/chains";
import {
  AGENT_ADDRESS, EXPLORER, TOKENS, agentAccount, attributionCode, balanceOf, checkTag, fail, fmt,
  loadEnv, pickGas, publicClient, taggedWalletClient,
} from "./lib/agent.mjs";

const TEXTILE = "https://api.textilecredit.com/v2";
const SELL = TOKENS.wARS;
const BUY = TOKENS.USDT;

// --- argumentos
const args = process.argv.slice(2);
const send = args.includes("--send");
const amountArg = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--user");
const userArg = args.includes("--user") ? args[args.indexOf("--user") + 1] : null;
if (!amountArg || !(Number(amountArg) > 0)) fail("Uso: node scripts/agent-protect.mjs <monto wARS> [--user 0x…] [--send]");
if (userArg && !isAddress(userArg, { strict: false })) fail(`Dirección de usuario inválida: ${userArg}`);
const user = userArg ? getAddress(userArg) : null;
const amount = parseUnits(amountArg, SELL.decimals);

loadEnv();
const code = attributionCode({ required: send });
const account = agentAccount({ required: send });
const agent = account?.address ?? AGENT_ADDRESS;

async function textile(path, body, headers = {}) {
  const res = await fetch(`${TEXTILE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(75_000), // request puede tardar hasta ~70 s según la doc
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `Textile HTTP ${res.status}`);
  return json.data;
}

function warn(msg) {
  console.log(`⚠ ${msg} (en modo simulación se sigue para mostrar la cotización)`);
}

const quoteBody = { chainId: celo.id, sellToken: SELL.address.toLowerCase(), buyToken: BUY.address.toLowerCase(), sellAmount: amount.toString() };

// --- 1. Estado y simulación
console.log(`Agente: ${agent}${user ? ` · usuario: ${user}` : ""}`);
console.log(`Etiqueta: ${code ?? "(no definida)"}`);
const gas = await pickGas(agent);
console.log(`Gas en: ${gas.label}`);
const source = user ?? agent;
const sourceBal = await balanceOf(SELL, source);
console.log(`Saldo ${user ? "del usuario" : "del agente"}: ${fmt(SELL, sourceBal)}`);
if (user) {
  const allowance = await publicClient.readContract({ address: SELL.address, abi: erc20Abi, functionName: "allowance", args: [user, agent] });
  console.log(`Permiso del usuario al agente: ${fmt(SELL, allowance)}`);
  if (allowance < amount) (send ? fail : warn)("El permiso del usuario no alcanza para este monto.");
}
if (sourceBal < amount) (send ? fail : warn)(`No hay ${fmt(SELL, amount)} disponibles.`);

// La preview cotiza montos chicos que después la cotización firme rechaza: chequear el mínimo real.
const levels = await textile(`/rfq/levels?chainId=${celo.id}`);
const pair = levels.pairs.find((p) => p.sellToken === quoteBody.sellToken && p.buyToken === quoteBody.buyToken);
if (!pair) fail("Textile no tiene habilitado el par wARS → USD₮ en este momento.");
if (amount < BigInt(pair.minSellAmount)) fail(`El mínimo de Textile hoy es ${fmt(SELL, BigInt(pair.minSellAmount))}.`);
if (amount > BigInt(pair.maxSellAmount)) fail(`El máximo de Textile hoy es ${fmt(SELL, BigInt(pair.maxSellAmount))}.`);

const preview = await textile("/rfq/preview", quoteBody);
if (preview.status !== "preview") fail(`Textile no cotiza este monto (${preview.reason ?? preview.status}).`);
console.log(`Cotización indicativa: ${fmt(SELL, BigInt(preview.sellAmount))} → ${fmt(BUY, BigInt(preview.buyAmount))} (comisión ${fmt(SELL, BigInt(preview.feeAmount))})`);
if (!send) {
  console.log("\nModo simulación. Para convertir de verdad agregá --send");
  process.exit(0);
}
if (!gas.ok) fail("La wallet del agente no tiene saldo para pagar el gas.");

const wallet = taggedWalletClient(account, code);
const fee = gas.feeCurrency ? { feeCurrency: gas.feeCurrency } : {};
const hashes = [];
async function wait(label, hash) {
  console.log(`→ ${label}: ${EXPLORER}/tx/${hash}`);
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${label} falló`);
  hashes.push(hash);
}

let pulled = false;
try {
  // --- 2. Tomar los wARS del usuario (solo hasta el tope que aprobó)
  if (user) {
    await wait("tomar wARS del usuario", await wallet.writeContract({ address: SELL.address, abi: erc20Abi, functionName: "transferFrom", args: [user, agent, amount], ...fee }));
    pulled = true;
  }

  // --- 3. Cotización firme (prueba de control EIP-712 firmada por el agente)
  const takerProof = { nonce: `0x${randomBytes(32).toString("hex")}`, issuedAt: Date.now() };
  takerProof.signature = await account.signTypedData({
    domain: { name: "Textile Taker Control", version: "1", chainId: celo.id },
    types: { TakerControl: [
      { name: "taker", type: "address" }, { name: "chainId", type: "uint256" },
      { name: "nonce", type: "bytes32" }, { name: "issuedAt", type: "uint256" },
    ] },
    primaryType: "TakerControl",
    message: { taker: agent, chainId: BigInt(celo.id), nonce: takerProof.nonce, issuedAt: BigInt(takerProof.issuedAt) },
  });
  const rfq = await textile("/rfq/request", { ...quoteBody, taker: agent, takerProof });
  if (rfq.status !== "quoted") throw new Error(`Textile no dio cotización firme (${rfq.reason ?? rfq.status}).`);
  const q = rfq.quote;
  const expiresAt = Date.parse(q.expiresAt);
  console.log(`Cotización firme ${rfq.rfqId}: pago ${fmt(SELL, BigInt(q.takerPays))} → recibo ${fmt(BUY, BigInt(q.buyAmount))} · vence ${q.expiresAt}`);

  // --- 4. Permiso al reactor de Textile (solo si el actual no alcanza) y swap
  const current = await publicClient.readContract({ address: SELL.address, abi: erc20Abi, functionName: "allowance", args: [agent, q.reactor] });
  if (current < BigInt(q.takerPays)) {
    await wait("permiso a Textile", await wallet.writeContract({ address: SELL.address, abi: erc20Abi, functionName: "approve", args: [q.reactor, BigInt(q.takerPays)], ...fee }));
  }
  if (Date.now() > expiresAt - 3_000) throw new Error("La cotización venció mientras se aprobaba: volvé a correr el script.");
  const swapHash = await wallet.sendTransaction({ to: rfq.transactions.swap.to, data: rfq.transactions.swap.data, value: 0n, ...fee });
  await wait("conversión en Textile", swapHash);
  await textile(`/rfq/${encodeURIComponent(rfq.rfqId)}/submit`, { txHash: swapHash }, { "X-Rfq-Claim": rfq.claimToken }).catch((e) => console.log(`  (aviso: no se pudo informar el hash a Textile: ${e.message})`));
  pulled = false;

  // --- 5. Devolver los USD₮ al usuario
  if (user) {
    await wait("devolver USD₮ al usuario", await wallet.writeContract({ address: BUY.address, abi: erc20Abi, functionName: "transfer", args: [user, BigInt(q.buyAmount)], ...fee }));
  }

  console.log(`\n✓ Protegidos ${fmt(SELL, BigInt(q.takerPays))} → ${fmt(BUY, BigInt(q.buyAmount))}`);
  for (const h of hashes) await checkTag(h, code);
} catch (e) {
  console.error(`✗ ${e.message}`);
  // Si ya tomamos los wARS del usuario y la conversión no salió, se los devolvemos.
  if (pulled) {
    console.error("  Devolviendo los wARS al usuario…");
    await wait("devolver wARS al usuario", await wallet.writeContract({ address: SELL.address, abi: erc20Abi, functionName: "transfer", args: [user, amount], ...fee }));
  }
  process.exit(1);
}
