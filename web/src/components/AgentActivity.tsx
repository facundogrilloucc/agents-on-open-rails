"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { AGENT_ADDRESS, EXPLORER_URL, TOKENS } from "@/config/app";

// Movimientos de la wallet del agente (conversiones en Textile, permisos usados, pagos), leídos de la
// API pública de Blockscout para Celo. Solo lectura.
const BLOCKSCOUT = "https://celo.blockscout.com/api/v2";
const KNOWN = new Map<string, { symbol: string; decimals: number }>(
  Object.values(TOKENS).map((t) => [t.address.toLowerCase(), { symbol: t.symbol, decimals: t.decimals }]),
);

type Transfer = {
  transaction_hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string };
  token: { address_hash?: string; address?: string };
  total: { value: string; decimals: string };
};

export type Leg = { symbol: string; amount: number; incoming: boolean };
export type Movement = { hash: string; timestamp: string; legs: Leg[]; kind: string };

function classify(legs: Leg[]): string {
  const outWars = legs.some((l) => l.symbol === "wARS" && !l.incoming);
  const inDollars = legs.some((l) => l.symbol !== "wARS" && l.incoming);
  if (outWars && inDollars) return "Conversión a dólares";
  const inWars = legs.some((l) => l.symbol === "wARS" && l.incoming);
  const outDollars = legs.some((l) => l.symbol !== "wARS" && !l.incoming);
  if (inWars && outDollars) return "Conversión a pesos";
  if (legs.every((l) => l.incoming)) return legs.some((l) => l.symbol === "wARS") ? "Ingreso de pesos" : "Ingreso";
  if (legs.every((l) => !l.incoming)) return legs.some((l) => l.symbol === "wARS") ? "Envío de pesos" : "Pago / envío";
  return "Movimiento";
}

export async function fetchMovements(): Promise<Movement[]> {
  const res = await fetch(`${BLOCKSCOUT}/addresses/${AGENT_ADDRESS}/token-transfers?type=ERC-20`);
  if (!res.ok) throw new Error(`Blockscout HTTP ${res.status}`);
  const items: Transfer[] = (await res.json()).items ?? [];
  const agent = AGENT_ADDRESS.toLowerCase();
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const byTx = new Map<string, Movement>();
  for (const t of items) {
    const token = KNOWN.get((t.token.address_hash ?? t.token.address ?? "").toLowerCase());
    if (!token) continue;
    const incoming = t.to.hash.toLowerCase() === agent;
    if (!incoming && t.from.hash.toLowerCase() !== agent) continue;
    // El gas pagado en stablecoins (fee abstraction de Celo) aparece como cobro/reintegro contra 0x0: no es un movimiento.
    if (t.from.hash.toLowerCase() === ZERO_ADDRESS || t.to.hash.toLowerCase() === ZERO_ADDRESS) continue;
    const m = byTx.get(t.transaction_hash) ?? { hash: t.transaction_hash, timestamp: t.timestamp, legs: [], kind: "" };
    const amount = Number(formatUnits(BigInt(t.total.value), token.decimals));
    // Sumar en una sola pata lo del mismo token y sentido (p. ej. monto + comisión de Textile).
    const same = m.legs.find((l) => l.symbol === token.symbol && l.incoming === incoming);
    if (same) same.amount += amount;
    else m.legs.push({ symbol: token.symbol, amount, incoming });
    byTx.set(t.transaction_hash, m);
  }
  // Blockscout devuelve lo más reciente primero; alcanza con las últimas 10 operaciones.
  return [...byTx.values()].slice(0, 10).map((m) => ({ ...m, kind: classify(m.legs) }));
}

export const AGENT_ACTIVITY_KEY = ["agent-activity"];

function fmtAmount(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: n < 10 ? 4 : 2 });
}

export function AgentActivity() {
  const { data, isLoading, isError } = useQuery({
    queryKey: AGENT_ACTIVITY_KEY,
    queryFn: fetchMovements,
    refetchInterval: 30_000,
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-muted">Actividad del agente</h2>
        <a
          href={`${EXPLORER_URL}/address/${AGENT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted underline underline-offset-2"
        >
          Ver la wallet del agente ↗
        </a>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-muted">Cargando movimientos…</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-500">No se pudo leer la actividad en este momento.</p>
      ) : !data?.length ? (
        <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          Todavía no hay movimientos. Acá van a aparecer las conversiones de wARS a USD₮ y los pagos a
          servicios, con link a cada transacción.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {data.map((m) => (
            <li key={m.hash} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <div className="font-medium">{m.kind}</div>
                <div className="text-xs text-muted">
                  {new Date(m.timestamp).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                {m.legs.map((l, i) => (
                  <span key={i} className={l.incoming ? "text-accent" : "text-muted"}>
                    {l.incoming ? "+" : "−"}
                    {fmtAmount(l.amount)} {l.symbol}
                  </span>
                ))}
                <a
                  href={`${EXPLORER_URL}/tx/${m.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted underline underline-offset-2"
                >
                  tx ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
