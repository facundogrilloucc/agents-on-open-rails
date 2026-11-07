"use client";

import { useQuery } from "@tanstack/react-query";
import { AGENT_ACTIVITY_KEY, fetchMovements } from "@/components/AgentActivity";
import type { TextileQuoteResponse } from "@/app/api/textile/quote/route";

// Pesos que el agente ya pasó a dólares (conversiones reales en Textile, leídas de la blockchain)
// y cuánto valen hoy esos USD₮ en pesos con la cotización actual de Textile FX.
async function fetchWarsPerUsdt(): Promise<number | null> {
  const res = await fetch("/api/textile/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction: "wARS_to_USDT", amount: 10000 }),
  });
  const q: TextileQuoteResponse = await res.json();
  // Precio de referencia de Textile (el mismo benchmark que scripts/pnl.mjs); si no está, la cotización.
  if (q.status === "preview") return q.referenceWarsPerUsdt ?? q.warsPerUsdt;
  if (q.status === "no_quote") return q.referenceWarsPerUsdt;
  return null;
}

const ars = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
const usd = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function SavingsCard() {
  const movements = useQuery({ queryKey: AGENT_ACTIVITY_KEY, queryFn: fetchMovements, refetchInterval: 30_000 });
  const rate = useQuery({ queryKey: ["wars-per-usdt"], queryFn: fetchWarsPerUsdt, refetchInterval: 60_000 });

  let warsIn = 0;
  let usdOut = 0;
  for (const m of movements.data ?? []) {
    if (m.kind !== "Conversión a dólares") continue;
    for (const l of m.legs) {
      if (l.symbol === "wARS" && !l.incoming) warsIn += l.amount;
      if (l.symbol !== "wARS" && l.incoming) usdOut += l.amount;
    }
  }
  const valueToday = rate.data ? usdOut * rate.data : null;
  const diff = valueToday !== null ? valueToday - warsIn : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Pesos protegidos en dólares</h2>
      {warsIn === 0 ? (
        <>
          <div className="mt-2 text-3xl font-semibold tabular-nums">—</div>
          <p className="mt-1 text-xs text-muted">
            {movements.isLoading ? "Leyendo conversiones…" : "Se calcula cuando el agente haga su primera conversión."}
          </p>
        </>
      ) : (
        <>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {usd(usdOut)} <span className="text-base font-normal text-muted">USD₮</span>
          </div>
          <p className="mt-1 text-sm text-muted tabular-nums">a partir de {ars(warsIn)} wARS convertidos en Textile FX</p>
          {valueToday !== null && diff !== null && (
            <p className="mt-3 text-xs text-muted tabular-nums">
              Hoy valen {ars(valueToday)} wARS
              {Math.abs(diff) < 1
                ? " (lo mismo que si los dejabas en pesos)"
                : ` (${diff > 0 ? "+" : "−"}${ars(Math.abs(diff))} frente a haberlos dejado en pesos)`}
              . Incluye la comisión de Textile; no el gas. Si el dólar sube, la diferencia crece a tu favor.
            </p>
          )}
        </>
      )}
    </section>
  );
}
