"use client";

import { erc20Abi, formatUnits, type Address } from "viem";
import { useReadContracts } from "wagmi";
import { TOKENS } from "@/config/app";
import { useWarsPerUsdt } from "@/lib/useWarsPerUsdt";

const tokenList = Object.values(TOKENS);

const ars = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
const units = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Saldos en pesos primero (lo que entiende el usuario) y en tokens debajo. Los dólares (USD₮, USDC) se
// pasan a pesos con el precio de referencia de Textile FX.
export function Balances({ address }: { address: Address }) {
  const { data, isLoading, isError } = useReadContracts({
    contracts: tokenList.map((t) => ({
      address: t.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    })),
    query: { refetchInterval: 15_000 },
  });
  const rate = useWarsPerUsdt().data ?? null;

  const rows = tokenList.map((token, i) => {
    const r = data?.[i];
    const amount = r?.status === "success" ? Number(formatUnits(r.result, token.decimals)) : null;
    const inPesos = amount === null ? null : token.symbol === "wARS" ? amount : rate ? amount * rate : null;
    return { token, amount, inPesos };
  });
  const total = rows.every((r) => r.inPesos !== null) ? rows.reduce((s, r) => s + (r.inPesos ?? 0), 0) : null;
  const dollars = rows.filter((r) => r.token.symbol !== "wARS").reduce((s, r) => s + (r.inPesos ?? 0), 0);
  const protectedPct = total ? Math.round((dollars / total) * 100) : null;

  return (
    <section className="rounded-3xl bg-feature p-6 text-feature-foreground sm:p-8">
      <h2 className="text-sm font-medium text-feature-muted">Tu plata, en pesos</h2>
      <div className="mt-1 font-display text-5xl font-bold tracking-tight text-accent tabular-nums sm:text-6xl">
        {isLoading || total === null ? "…" : `$ ${ars(total)}`}
      </div>
      {protectedPct !== null && (
        <div className="mt-5 max-w-md">
          <div className="flex justify-between text-sm tabular-nums">
            <span>{protectedPct} % protegido en dólares</span>
            {rate && <span className="text-feature-muted">1 USD₮ = $ {ars(rate)}</span>}
          </div>
          {/* Parte de la plata que ya está en dólares (USD₮ + USDC) sobre el total en pesos */}
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-label="Parte protegida en dólares"
            aria-valuenow={protectedPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${protectedPct}%` }} />
          </div>
        </div>
      )}
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {rows.map(({ token, amount, inPesos }) => (
          <li key={token.symbol} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-feature-muted">{token.name}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {isLoading ? "…" : inPesos === null ? "—" : `$ ${ars(inPesos)}`}
            </div>
            <div className="text-xs text-feature-muted tabular-nums">
              {amount === null ? "" : `${units(amount)} ${token.symbol}`}
            </div>
          </li>
        ))}
      </ul>
      {isError && <p className="mt-3 text-xs text-[#ffb4a6]">No se pudieron leer los saldos.</p>}
    </section>
  );
}
