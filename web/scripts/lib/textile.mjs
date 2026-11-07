// Cliente mínimo de Textile FX (RFQ). API documentada en docs.textilecredit.com: api.textilecredit.com/v2.
// El precio de referencia (mid) solo lo expone la app web de Textile (app.textilecredit.com/api/price).
import { celo } from "viem/chains";

export const TEXTILE_API = "https://api.textilecredit.com/v2";
const PRICE_API = "https://app.textilecredit.com/api/price";

export async function textile(path, body, headers = {}) {
  const res = await fetch(`${TEXTILE_API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(75_000), // /rfq/request puede tardar hasta ~70 s según la doc
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `Textile HTTP ${res.status}`);
  return json.data;
}

// wARS por 1 USD₮ según el precio de referencia de Textile (o null si no responde).
export async function referenceWarsPerUsdt() {
  try {
    const res = await fetch(`${PRICE_API}?pair=wars-usdt&chainId=${celo.id}`, { signal: AbortSignal.timeout(10_000) });
    const price = (await res.json())?.price; // USD₮ por 1 wARS
    return price > 0 ? 1 / price : null;
  } catch {
    return null;
  }
}

// Mínimo y máximo de venta del par hoy (en unidades base del token vendido).
export async function pairLimits(sellToken, buyToken) {
  const levels = await textile(`/rfq/levels?chainId=${celo.id}`);
  const p = levels.pairs.find((x) => x.sellToken === sellToken.toLowerCase() && x.buyToken === buyToken.toLowerCase());
  return p ? { min: BigInt(p.minSellAmount), max: BigInt(p.maxSellAmount) } : null;
}
