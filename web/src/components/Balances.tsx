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
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-muted">Tu plata, en pesos</h2>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {isLoading || total === null ? "…" : `$ ${ars(total)}`}
          </div>
        </div>
        {protectedPct !== null && (
          <p className="text-sm text-muted tabular-nums">
            {protectedPct} % protegido en dólares
            {rate ? ` · 1 USD₮ = $ ${ars(rate)}` : ""}
          </p>
        )}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map(({ token, amount, inPesos }) => (
          <li key={token.symbol} className="rounded-xl bg-background p-4">
            <div className="text-xs text-muted">{token.name}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {isLoading ? "…" : inPesos === null ? "—" : `$ ${ars(inPesos)}`}
            </div>
            <div className="text-xs text-muted tabular-nums">
              {amount === null ? "" : `${units(amount)} ${token.symbol}`}
            </div>
          </li>
        ))}
      </ul>
      {isError && <p className="mt-3 text-xs text-red-500">No se pudieron leer los saldos.</p>}
    </section>
  );
}
