// Modo autónomo: el agente revisa cada `watch.intervalSeconds` si hay pesos para proteger y los
// convierte a USD₮ en Textile FX, siempre dentro de la política (src/config/agent-policy.json).
//
//   node scripts/agent-watch.mjs            → solo mira y dice qué haría (no firma nada)
//   node scripts/agent-watch.mjs --send     → opera de verdad
//   node scripts/agent-watch.mjs --once     → una sola pasada (sirve para cron)
//
// Fuentes de pesos que vigila:
//   - wARS que llegan directo a la wallet del agente (por ejemplo, desde la rampa de Ripio);
//   - usuarios que le dieron permiso (approve) al agente sobre sus wARS: toma hasta el tope aprobado,
//     convierte y les devuelve los USD₮. Los descubre leyendo los eventos Approval de wARS en Blockscout.
import { erc20Abi, getAddress } from "viem";
import { AGENT_ADDRESS, TOKENS, agentAccount, attributionCode, balanceOf, fmt, loadEnv, publicClient } from "./lib/agent.mjs";
import { loadPolicy } from "./lib/policy.mjs";
import { protect } from "./lib/protect.mjs";

const args = process.argv.slice(2);
const send = args.includes("--send");
const once = args.includes("--once");

loadEnv();
const code = attributionCode({ required: send });
const account = agentAccount({ required: send });
const agent = account?.address ?? AGENT_ADDRESS;
const SELL = TOKENS.wARS;

const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const BACKOFF_MS = 10 * 60 * 1000; // después de un fallo, esa fuente espera 10 minutos
const backoff = new Map();

const stamp = () => new Date().toLocaleString("es-AR", { hour12: false });
const log = (msg) => console.log(`[${stamp()}] ${msg}`);
const min = (...xs) => xs.reduce((a, b) => (b < a ? b : a));

// Dueños de wARS que alguna vez aprobaron al agente como spender (Blockscout, API compatible con Etherscan).
async function approvers(fromBlock) {
  const spender = `0x${agent.slice(2).toLowerCase().padStart(64, "0")}`;
  const url = `https://celo.blockscout.com/api?module=logs&action=getLogs&address=${SELL.address}` +
    `&fromBlock=${fromBlock}&toBlock=latest&topic0=${APPROVAL_TOPIC}&topic2=${spender}&topic0_2_opr=and`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const json = await res.json();
  if (!Array.isArray(json.result)) return [];
  return [...new Set(json.result.map((l) => getAddress(`0x${l.topics[1].slice(26)}`)))];
}

async function tick(policy) {
  const sources = [{ user: null, label: "agente" }];
  try {
    for (const u of await approvers(policy.usersFromBlock)) sources.push({ user: u, label: `usuario ${u.slice(0, 6)}…${u.slice(-4)}` });
  } catch (e) {
    log(`(no se pudieron leer los permisos de usuarios: ${e.message})`);
  }

  let acted = false;
  for (const { user, label } of sources) {
    const key = user ?? "agent";
    if ((backoff.get(key) ?? 0) > Date.now()) continue;

    const bal = await balanceOf(SELL, user ?? agent);
    let available = user ? bal : bal - policy.keepBuffer;
    if (user) {
      const allowance = await publicClient.readContract({ address: SELL.address, abi: erc20Abi, functionName: "allowance", args: [user, agent] });
      available = min(bal, allowance);
    }
    if (available < policy.minConvert) continue; // nada para proteger todavía (no se registra: es lo normal)

    const amount = min(available, policy.maxPerRun);
    log(`${label}: hay ${fmt(SELL, available)} para proteger → intento con ${fmt(SELL, amount)}`);
    const r = await protect({ amount, user, send, account, code, policy, log: (m) => log(`  ${m}`) });
    if (r.status === "failed") backoff.set(key, Date.now() + BACKOFF_MS);
    acted = true;
  }
  if (!acted) log(`sin pesos para proteger (mínimo ${fmt(SELL, policy.minConvert)}).`);
}

log(`Agente ${agent} · ${send ? "MODO REAL (--send)" : "modo observación (sin --send no firma nada)"}`);
for (;;) {
  const policy = loadPolicy(); // se relee en cada pasada: cambiar la política no requiere reiniciar
  try {
    await tick(policy);
  } catch (e) {
    log(`error en la pasada: ${e.message}`);
  }
  if (once) break;
  await new Promise((r) => setTimeout(r, policy.intervalSeconds * 1000));
}
