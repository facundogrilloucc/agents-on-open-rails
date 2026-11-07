// Rendimiento del agente frente a haberse quedado en pesos, reconstruido desde la blockchain
// (Blockscout) para que cualquiera lo pueda verificar. Solo lectura.
//
//   node scripts/pnl.mjs          → resumen y operación por operación, con links
//   node scripts/pnl.mjs --json   → lo mismo en JSON
//
// Benchmark: "si esos wARS se hubieran quedado en pesos". Para cada conversión wARS → USD₮:
//   valor hoy (en wARS)      = USD₮ recibidos × precio de referencia actual (wARS por USD₮)
//   rendimiento (en wARS)    = valor hoy − wARS vendidos − gas (pasado a wARS)
// El costo de ejecución contra la referencia del momento sale del registro (data/agent-ledger.jsonl)
// cuando la operación la hizo el agente con la política actual.
import { formatUnits } from "viem";
import { AGENT_ADDRESS, EXPLORER, TOKENS } from "./lib/agent.mjs";
import { readLedger } from "./lib/policy.mjs";
import { referenceWarsPerUsdt } from "./lib/textile.mjs";

const BLOCKSCOUT = "https://celo.blockscout.com/api/v2";
const GAS_SYSTEM = "0x000000000000000000000000000000000ce106a5"; // cobra/reintegra el gas pagado en stablecoins
const agent = AGENT_ADDRESS.toLowerCase();
const byAddr = Object.fromEntries(Object.values(TOKENS).map((t) => [t.address.toLowerCase(), t]));

async function allTransfers() {
  const out = [];
  let params = "";
  for (let page = 0; page < 20; page++) {
    const res = await fetch(`${BLOCKSCOUT}/addresses/${AGENT_ADDRESS}/token-transfers?type=ERC-20${params}`);
    const json = await res.json();
    out.push(...(json.items ?? []));
    if (!json.next_page_params) break;
    params = "&" + new URLSearchParams(json.next_page_params).toString();
  }
  return out;
}

const transfers = await allTransfers();
const txs = new Map();
for (const t of transfers) {
  const token = byAddr[(t.token.address_hash ?? t.token.address ?? "").toLowerCase()];
  if (!token) continue;
  const from = t.from.hash.toLowerCase();
  const to = t.to.hash.toLowerCase();
  const amount = Number(formatUnits(BigInt(t.total.value), token.decimals));
  const tx = txs.get(t.transaction_hash) ?? { hash: t.transaction_hash, at: t.timestamp, warsOut: 0, usdtIn: 0, gasUsdt: 0 };
  if (from === GAS_SYSTEM && to === agent) tx.gasUsdt -= amount; // reintegro de gas
  else if (to === GAS_SYSTEM && from === agent) tx.gasUsdt += amount; // cobro de gas
  else if (token.symbol === "wARS" && from === agent) tx.warsOut += amount;
  else if (token.symbol !== "wARS" && to === agent) tx.usdtIn += amount;
  txs.set(t.transaction_hash, tx);
}

const ledger = new Map(readLedger().filter((e) => e.type === "trade").map((e) => [e.swapTx.toLowerCase(), e]));
const refNow = await referenceWarsPerUsdt();
const trades = [...txs.values()]
  .filter((t) => t.warsOut > 0 && t.usdtIn > 0)
  .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  .map((t) => {
    const l = ledger.get(t.hash.toLowerCase());
    const rate = t.warsOut / t.usdtIn;
    const valueNowWars = refNow ? t.usdtIn * refNow : null;
    const gasWars = refNow ? t.gasUsdt * refNow : null;
    return {
      tx: t.hash, at: t.at, warsSold: t.warsOut, usdtReceived: t.usdtIn, rate,
      refRateAtTrade: l?.refRate ?? null, executionCostBps: l?.slippageBps ?? null, rfqId: l?.rfqId ?? null,
      gasUsdt: t.gasUsdt, valueNowWars, returnWars: valueNowWars !== null ? valueNowWars - t.warsOut - gasWars : null,
    };
  });

const totalGasUsdt = [...txs.values()].reduce((s, t) => s + t.gasUsdt, 0);
const sum = (k) => trades.reduce((s, t) => s + (t[k] ?? 0), 0);
const summary = {
  agent: AGENT_ADDRESS,
  referenceWarsPerUsdtNow: refNow,
  trades: trades.length,
  warsSold: sum("warsSold"),
  usdtReceived: sum("usdtReceived"),
  averageRate: sum("warsSold") / (sum("usdtReceived") || 1),
  gasUsdtOnTrades: sum("gasUsdt"),
  gasUsdtAllTxs: totalGasUsdt,
  valueNowWars: refNow ? sum("valueNowWars") : null,
  returnWars: refNow ? sum("returnWars") : null,
};
summary.returnPct = summary.returnWars !== null && summary.warsSold ? (summary.returnWars / summary.warsSold) * 100 : null;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ summary, trades }, null, 2));
  process.exit(0);
}

const n = (x, d = 2) => (x === null ? "—" : x.toLocaleString("es-AR", { maximumFractionDigits: d, minimumFractionDigits: Math.min(d, 2) }));
console.log(`Rendimiento del agente ${AGENT_ADDRESS} frente a quedarse en pesos`);
console.log(`Referencia actual (Textile): 1 USD₮ = ${n(refNow)} wARS\n`);
for (const t of trades) {
  console.log(`${t.at.slice(0, 16).replace("T", " ")}  ${n(t.warsSold)} wARS → ${n(t.usdtReceived, 4)} USD₮  (1 USD₮ = ${n(t.rate)} wARS` +
    `${t.executionCostBps !== null ? `, ${t.executionCostBps} bps vs. referencia` : ""})  gas ${n(t.gasUsdt, 4)} USD₮`);
  console.log(`   hoy valen ${n(t.valueNowWars)} wARS → rendimiento ${n(t.returnWars)} wARS · ${EXPLORER}/tx/${t.tx}`);
}
console.log(`\nTotal: ${summary.trades} ${summary.trades === 1 ? "conversión" : "conversiones"} · ${n(summary.warsSold)} wARS → ${n(summary.usdtReceived, 4)} USD₮ (promedio 1 USD₮ = ${n(summary.averageRate)} wARS)`);
console.log(`Valor hoy: ${n(summary.valueNowWars)} wARS · rendimiento neto de gas: ${n(summary.returnWars)} wARS (${n(summary.returnPct, 3)} %)`);
console.log(`Gas total del agente (todas sus transacciones, incl. registro ERC-8004): ${n(summary.gasUsdtAllTxs, 4)} USD₮`);
