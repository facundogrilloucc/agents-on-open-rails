// Pide cotizaciones (solo lectura) a Textile FX en Celo mainnet. No firma ni mueve fondos.
// Uso: node scripts/textile-quote.mjs [montos en wARS separados por coma]
// Ej.:  node scripts/textile-quote.mjs 1000,10000,100000,1000000
//
// Ojo: es el endpoint que usa la app web de Textile; no encontramos documentación pública.
import { formatUnits, parseUnits } from "viem";

const API = "https://app.textilecredit.com";
const CHAIN_ID = 42220;
const wARS = { symbol: "wARS", address: "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d", decimals: 18 };
const USDT = { symbol: "USD₮", address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", decimals: 6 };

const fmt = (n, d = 2) => n.toLocaleString("es-AR", { maximumFractionDigits: d });

// Mínimo y máximo que hoy aceptan los market makers para un par.
async function limits(sell, buy) {
  const res = await fetch(`${API}/v2/rfq/levels?chainId=${CHAIN_ID}`);
  const pairs = (await res.json().catch(() => null))?.data?.pairs ?? [];
  const p = pairs.find(
    (x) => x.sellToken === sell.address.toLowerCase() && x.buyToken === buy.address.toLowerCase(),
  );
  if (!p) return null;
  return {
    min: Number(formatUnits(BigInt(p.minSellAmount), p.sellDecimals)),
    max: Number(formatUnits(BigInt(p.maxSellAmount), p.sellDecimals)),
  };
}

async function preview(sell, buy, amount) {
  const res = await fetch(`${API}/v2/rfq/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chainId: CHAIN_ID,
      sellToken: sell.address.toLowerCase(),
      buyToken: buy.address.toLowerCase(),
      sellAmount: parseUnits(String(amount), sell.decimals).toString(),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    return { error: json?.error?.message ?? `HTTP ${res.status}` };
  }
  const d = json.data;
  const available = Number(formatUnits(BigInt(d.availableSellAmount ?? 0), sell.decimals));
  if (d.status !== "preview") {
    return { error: `sin cotización (${d.reason ?? d.status}); disponible ${fmt(available, 6)} ${sell.symbol}` };
  }
  return {
    sell: Number(formatUnits(BigInt(d.sellAmount), sell.decimals)),
    buy: Number(formatUnits(BigInt(d.buyAmount), buy.decimals)),
    fee: Number(formatUnits(BigInt(d.feeAmount), sell.decimals)),
    available,
  };
}

async function midPrice() {
  const res = await fetch(`${API}/api/price?pair=wars-usdt&chainId=${CHAIN_ID}`);
  const json = await res.json().catch(() => null);
  return json?.price ?? null; // USD₮ por 1 wARS
}

const amounts = (process.argv[2] ?? "1000,10000,100000,1000000").split(",").map(Number);

const mid = await midPrice();
console.log(`Precio de referencia: ${mid ? `1 USD₮ = ${fmt(1 / mid)} wARS` : "no disponible"}\n`);

for (const [s, b] of [[wARS, USDT], [USDT, wARS]]) {
  const l = await limits(s, b);
  console.log(`Límites ${s.symbol} → ${b.symbol}: ${l ? `mín. ${fmt(l.min, 4)} / máx. ${fmt(l.max)} ${s.symbol}` : "par no listado"}`);
}

console.log("\nwARS → USD₮ (proteger pesos)");
for (const a of amounts) {
  const q = await preview(wARS, USDT, a);
  if (q.error) { console.log(`  ${fmt(a)} wARS: ERROR ${q.error}`); continue; }
  const rate = q.sell / q.buy;
  const slip = mid ? ((rate * mid - 1) * 100).toFixed(3) : "?";
  console.log(`  ${fmt(a)} wARS → ${fmt(q.buy, 6)} USD₮ | 1 USD₮ = ${fmt(rate)} wARS | vs. referencia ${slip}% | comisión ${fmt(q.fee, 4)} wARS | disponible ${fmt(q.available, 0)} wARS`);
}

console.log("\nUSD₮ → wARS (pagar en pesos)");
for (const a of amounts) {
  const usd = mid ? Number((a * mid).toFixed(6)) : a / 1600;
  const q = await preview(USDT, wARS, usd);
  if (q.error) { console.log(`  ${fmt(usd, 6)} USD₮: ERROR ${q.error}`); continue; }
  const rate = q.buy / q.sell;
  const slip = mid ? ((1 - rate * mid) * 100).toFixed(3) : "?";
  console.log(`  ${fmt(usd, 6)} USD₮ → ${fmt(q.buy)} wARS | 1 USD₮ = ${fmt(rate)} wARS | vs. referencia ${slip}% | comisión ${fmt(q.fee, 6)} USD₮ | disponible ${fmt(q.available, 2)} USD₮`);
}
